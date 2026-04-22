'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

type Invoice = {
  id: string
  invoice_number: string
  amount: number
  invoice_url: string | null
  status: string
  created_at: string
  created_by: string
  counterparties: {
    name: string
    inn: string
    status: string
  } | null
}

type RequestDetails = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  created_at: string
  created_by: string
  profiles: {
    full_name: string
  } | null
  invoices: Invoice[]
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const [request, setRequest] = useState<RequestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        // 1. Загружаем заявку вместе с профилем создателя
        const { data: reqData, error: reqError } = await supabase
          .from('requests')
          .select(`
            *,
            profiles:created_by(full_name)
          `)
          .eq('id', id)
          .single()

        if (reqError) {
          console.error('Ошибка загрузки заявки:', reqError)
          setRequest(null)
          return
        }

        // 2. Загружаем счета, привязанные к этой заявке, с данными контрагентов
        const { data: invoicesData, error: invError } = await supabase
          .from('invoices')
          .select(`
            *,
            counterparties(name, inn, status)
          `)
          .eq('request_id', id)
          .order('created_at', { ascending: false })

        if (invError) {
          console.error('Ошибка загрузки счетов:', invError)
        }

        // 3. Собираем полный объект заявки
        setRequest({
          ...reqData,
          invoices: invoicesData || []
        } as RequestDetails)
      } catch (err) {
        console.error('Критическая ошибка:', err)
        setRequest(null)
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [id, supabase])

  const handleApproveInvoice = async (invoiceId: string) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'approved',
        director_approved_by: profile?.id,
        director_approved_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
    if (!error) {
      router.refresh()
    } else {
      alert('Ошибка при согласовании: ' + error.message)
    }
    setActionLoading(false)
  }

  const handleRejectInvoice = async (invoiceId: string) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'rejected' })
      .eq('id', invoiceId)
    if (!error) {
      router.refresh()
    } else {
      alert('Ошибка при отклонении: ' + error.message)
    }
    setActionLoading(false)
  }

  const handleMarkPaid = async (invoiceId: string) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        accountant_paid_by: profile?.id,
        accountant_paid_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
    if (!error) {
      router.refresh()
    } else {
      alert('Ошибка при отметке оплаты: ' + error.message)
    }
    setActionLoading(false)
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Удалить счёт?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
    if (!error) {
      router.refresh()
    } else {
      alert('Ошибка удаления счёта: ' + error.message)
    }
  }

  const handleDeleteRequest = async () => {
    if (!confirm('Удалить заявку? Связанные счета останутся, но будут отвязаны.')) return
    const { error } = await supabase.from('requests').delete().eq('id', id)
    if (!error) {
      router.push('/dashboard')
    } else {
      alert('Ошибка удаления заявки: ' + error.message)
    }
  }

  if (loading) return <div className="p-4">Загрузка...</div>
  if (!request) return (
    <div className="p-4">
      <p className="text-red-500 mb-4">Заявка не найдена или у вас нет к ней доступа.</p>
      <Link href="/dashboard">
        <Button>Вернуться на главную</Button>
      </Link>
    </div>
  )

  const totalAmount = request.invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{request.internal_number}</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/requests/${id}/new-invoice`}>
            <Button>+ Добавить счёт</Button>
          </Link>
          {profile?.id === request.created_by && (
            <Button variant="destructive" size="sm" onClick={handleDeleteRequest}>
              <Trash2 className="h-4 w-4 mr-1" /> Удалить заявку
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Информация о сделке</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Проект</p>
            <p className="font-medium">{request.project_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Сделка</p>
            <p className="font-medium">{request.deal_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Создал</p>
            <p className="font-medium">{request.profiles?.full_name || 'Неизвестно'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Дата создания</p>
            <p className="font-medium">{format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">Общая сумма по сделке</p>
            <p className="font-bold text-xl">{totalAmount.toFixed(2)} ₽</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Счета в заявке</h2>
      {request.invoices.length === 0 ? (
        <p className="text-muted-foreground">Нет счетов. Добавьте новый счёт.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер счёта</TableHead>
              <TableHead>Контрагент</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.invoices.map((inv) => {
              const canApprove = profile?.role === 'director' && inv.status === 'pending_director'
              const canPay = profile?.role === 'accountant' && inv.status === 'approved'
              const canRequestPayment = profile?.role === 'engineer' && inv.status === 'approved'
              const canView = profile?.role !== 'engineer' && inv.invoice_url
              const canDelete = profile?.id === inv.created_by

              return (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>
                    {inv.counterparties?.name || '—'} (ИНН {inv.counterparties?.inn || '—'})
                    <br />
                    <Badge variant="outline">
                      {inv.counterparties?.status === 'approved' ? '✅ Проверен' : inv.counterparties?.status === 'rejected' ? '❌ Отклонен' : '⏳ На проверке'}
                    </Badge>
                  </TableCell>
                  <TableCell>{inv.amount.toFixed(2)} ₽</TableCell>
                  <TableCell>
                    <Badge>
                      {inv.status === 'draft' && 'Черновик'}
                      {inv.status === 'pending_security' && 'На проверке СБ'}
                      {inv.status === 'pending_director' && 'Ожидает директора'}
                      {inv.status === 'approved' && 'Согласован'}
                      {inv.status === 'paid' && 'Оплачен'}
                      {inv.status === 'rejected' && 'Отклонен'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canView && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={inv.invoice_url!} target="_blank" rel="noopener noreferrer">Просмотр</a>
                        </Button>
                      )}
                      {canApprove && (
                        <>
                          <Button size="sm" onClick={() => handleApproveInvoice(inv.id)} disabled={actionLoading}>Согласовать</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectInvoice(inv.id)} disabled={actionLoading}>Отклонить</Button>
                        </>
                      )}
                      {canPay && (
                        <Button size="sm" onClick={() => handleMarkPaid(inv.id)} disabled={actionLoading}>Оплачен</Button>
                      )}
                      {canRequestPayment && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">Запросить ПП</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Запрос платёжного поручения</DialogTitle>
                            </DialogHeader>
                            <div className="p-4 bg-gray-100 rounded whitespace-pre-line">
                              {`Уважаемые коллеги,\n\nПрошу ответным письмом направить платёжное поручение по счёту №${inv.invoice_number}.\n\nСсылка на счёт: ${inv.invoice_url || 'не указана'}\n\nС уважением, ${profile?.full_name}`}
                            </div>
                            <Button onClick={() => navigator.clipboard?.writeText(
                              `Уважаемые коллеги,\n\nПрошу ответным письмом направить платёжное поручение по счёту №${inv.invoice_number}.\n\nСсылка на счёт: ${inv.invoice_url || 'не указана'}\n\nС уважением, ${profile?.full_name}`
                            )}>Копировать текст</Button>
                          </DialogContent>
                        </Dialog>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteInvoice(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
