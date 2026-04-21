'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type Request = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  supplier_invoice_number: string
  invoice_url: string
  status: string
  counterparty: {
    name: string
    inn: string
    status: string
  }
  created_at: string
}

export function RequestList({ role, userId }: { role: string; userId?: string }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchRequests = async () => {
      let query = supabase
        .from('requests')
        .select(`
          *,
          counterparty:counterparties(name, inn, status)
        `)
        .order('created_at', { ascending: false })

      // Применяем фильтры согласно роли
      if (role === 'engineer' && userId) {
        query = query.eq('created_by', userId)
      } else if (role === 'accountant') {
        query = query.in('status', ['approved', 'paid'])
      }

      const { data, error } = await query
      if (!error) setRequests(data || [])
      setLoading(false)
    }
    fetchRequests()
  }, [supabase, role, userId])

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-200',
    pending_security: 'bg-yellow-200',
    pending_director: 'bg-blue-200',
    approved: 'bg-green-200',
    paid: 'bg-purple-200',
    rejected: 'bg-red-200',
  }

  if (loading) return <div>Загрузка заявок...</div>

  return (
    <div className="grid gap-4">
      {requests.length === 0 && <p>Нет заявок</p>}
      {requests.map((req) => (
        <Link key={req.id} href={`/dashboard/requests/${req.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{req.internal_number}</CardTitle>
                <Badge className={statusColors[req.status]}>
                  {req.status === 'draft' && 'Черновик'}
                  {req.status === 'pending_security' && 'На проверке СБ'}
                  {req.status === 'pending_director' && 'Ожидает директора'}
                  {req.status === 'approved' && 'Согласована'}
                  {req.status === 'paid' && 'Оплачена'}
                  {req.status === 'rejected' && 'Отклонена'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Проект: {req.project_name}</div>
                <div>Сделка: {req.deal_number}</div>
                <div>Счет поставщика: {req.supplier_invoice_number}</div>
                <div>Контрагент: {req.counterparty?.name} (ИНН {req.counterparty?.inn})</div>
                <div>Статус контрагента: {req.counterparty?.status === 'approved' ? '✅ Проверен' : req.counterparty?.status === 'rejected' ? '❌ Отклонен' : '⏳ На проверке'}</div>
                <div>Создана: {format(new Date(req.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}