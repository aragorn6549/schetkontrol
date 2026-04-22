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
  invoice_url: string
  status: string
  created_at: string
  counterparties: {
    name: string
    inn: string
    status: string
  }

}

type RequestDetails = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  created_at: string
  profiles: {
    full_name: string
  }
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
    const { data, error } = await supabase
      .from('requests')
      .select(`...`) // ваш запрос
      .eq('id', id)
      .single();
    console.log('Request data:', data, 'Error:', error);
    setRequest(data);
    setLoading(false);
  };
  fetchRequest();
}, [id, supabase]);

  
  useEffect(() => {
    const fetchRequest = async () => {
const { data } = await supabase
  .from('requests')
  .select(`
    *,
    profiles:created_by(full_name),
    invoices(
      *,
      counterparties(name, inn, status)
    )
  `)
  .eq('id', id)
  .single()
      setRequest(data)
      setLoading(false)
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
    }
    setActionLoading(false)
  }

  if (loading) return <div>Загрузка...</div>
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
         {profile?.id === (request as any).created_by && (
           <Button
             variant="destructive"
             size="sm"
             onClick={async () => {
               if (!confirm('Удалить заявку? Связанные счета останутся, но будут отвязаны.')) return
               const { error } = await supabase.from('requests').delete().eq('id', id)
               if (!error) {
                 router.push('/dashboard')
               } else {
                 alert('Ошибка удаления: ' + error.message)
               }
             }}
           >
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
            <p className="font-medium">{request.profiles?.full_name}</p>
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
              const canView = profile?.role !== 'engineer'

              return (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>
                    {inv.counterparties.name} (ИНН {inv.counterparties.inn})
                    <br />
                    <Badge variant="outline">
                      {inv.counterparties.status === 'approved' ? '✅ Проверен' : inv.counterparties.status === 'rejected' ? '❌ Отклонен' : '⏳ На проверке'}
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
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">Просмотр</a>
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
                              {`Уважаемые коллеги,\n\nПрошу ответным письмом направить платёжное поручение по счёту №${inv.invoice_number}.\n\nСсылка на счёт: ${inv.invoice_url}\n\nС уважением, ${profile?.full_name}`}
                            </div>
                            <Button onClick={() => navigator.clipboard?.writeText(
                              `Уважаемые коллеги,\n\nПрошу ответным письмом направить платёжное поручение по счёту №${inv.invoice_number}.\n\nСсылка на счёт: ${inv.invoice_url}\n\nС уважением, ${profile?.full_name}`
                            )}>Копировать текст</Button>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                     {profile?.id === (inv as any).created_by && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="text-red-500"
                         onClick={async () => {
                           if (!confirm('Удалить счёт?')) return
                           const { error } = await supabase.from('invoices').delete().eq('id', inv.id)
                           if (!error) {
                             router.refresh()
                           } else {
                             alert('Ошибка удаления: ' + error.message)
                           }
                         }}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                    
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
