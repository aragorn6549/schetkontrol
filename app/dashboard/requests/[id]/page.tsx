'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type RequestDetails = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  supplier_invoice_number: string
  invoice_url: string
  status: string
  created_at: string
  counterparty: {
    id: string
    name: string
    inn: string
    kpp: string
    address: string
    status: string
  }
  profiles: {
    full_name: string
  }
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
      const { data } = await supabase
        .from('requests')
        .select(`
          *,
          counterparty:counterparties(*),
          profiles:created_by(full_name)
        `)
        .eq('id', id)
        .single()
      setRequest(data)
      setLoading(false)
    }
    fetchRequest()
  }, [id, supabase])

  const handleApprove = async () => {
    setActionLoading(true)
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'approved',
        director_approved_by: profile?.id,
        director_approved_at: new Date().toISOString()
      })
      .eq('id', id)
    if (!error) {
      router.refresh()
      setRequest({ ...request!, status: 'approved' })
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    setActionLoading(true)
    const { error } = await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (!error) {
      router.refresh()
      setRequest({ ...request!, status: 'rejected' })
    }
    setActionLoading(false)
  }

  const handleMarkPaid = async () => {
    setActionLoading(true)
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'paid',
        accountant_paid_by: profile?.id,
        accountant_paid_at: new Date().toISOString()
      })
      .eq('id', id)
    if (!error) {
      router.refresh()
      setRequest({ ...request!, status: 'paid' })
    }
    setActionLoading(false)
  }

  if (loading) return <div>Загрузка...</div>
  if (!request) return <div>Заявка не найдена</div>

  const canApprove = profile?.role === 'director' && request.status === 'pending_director'
  const canPay = profile?.role === 'accountant' && request.status === 'approved'
  const canRequestPayment = profile?.role === 'engineer' && request.status === 'approved'

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">{request.internal_number}</CardTitle>
            <Badge>
              {request.status === 'draft' && 'Черновик'}
              {request.status === 'pending_security' && 'На проверке СБ'}
              {request.status === 'pending_director' && 'Ожидает директора'}
              {request.status === 'approved' && 'Согласована'}
              {request.status === 'paid' && 'Оплачена'}
              {request.status === 'rejected' && 'Отклонена'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Проект</p>
              <p className="font-medium">{request.project_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сделка</p>
              <p className="font-medium">{request.deal_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Счет поставщика</p>
              <p className="font-medium">{request.supplier_invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ссылка на счет</p>
              <a href={request.invoice_url} target="_blank" className="text-blue-600 hover:underline">
                Открыть
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Создал</p>
              <p className="font-medium">{request.profiles?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата создания</p>
              <p className="font-medium">{format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Контрагент</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>Наименование: {request.counterparty.name}</div>
              <div>ИНН: {request.counterparty.inn}</div>
              <div>КПП: {request.counterparty.kpp || '-'}</div>
              <div>Адрес: {request.counterparty.address || '-'}</div>
              <div>Статус проверки: {request.counterparty.status === 'approved' ? '✅ Одобрен' : request.counterparty.status === 'rejected' ? '❌ Отклонен' : '⏳ На проверке'}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {canApprove && (
              <>
                <Button onClick={handleApprove} disabled={actionLoading}>Согласовать</Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>Отклонить</Button>
              </>
            )}
            {canPay && (
              <Button onClick={handleMarkPaid} disabled={actionLoading}>Отметить как оплаченный</Button>
            )}
            {canRequestPayment && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Запросить ПП</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Текст письма для бухгалтерии</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 bg-gray-100 rounded">
                    <p>Уважаемые коллеги,</p>
                    <p>Прошу оплатить счет № {request.supplier_invoice_number}.</p>
                    <p>Ссылка на счет: {request.invoice_url}</p>
                    <p>С уважением, {profile?.full_name}</p>
                  </div>
                  <Button onClick={() => navigator.clipboard?.writeText(
                    `Уважаемые коллеги,\nПрошу оплатить счет № ${request.supplier_invoice_number}.\nСсылка на счет: ${request.invoice_url}\nС уважением, ${profile?.full_name}`
                  )}>Копировать текст</Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}