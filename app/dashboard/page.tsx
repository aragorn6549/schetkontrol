'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type RequestSummary = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  created_at: string
  invoice_count: number
  total_amount: number
}

type InvoiceSummary = {
  id: string
  invoice_number: string
  amount: number
  status: string
  created_at: string
  counterparty: { name: string }
  request: { internal_number: string } | null
}

export function DashboardHome() {
  const [requests, setRequests] = useState<RequestSummary[]>([])
  const [standaloneInvoices, setStandaloneInvoices] = useState<InvoiceSummary[]>([])
  const { profile } = useAuth()
  const supabase = createClient()
  const role = profile?.role

  useEffect(() => {
    const fetchData = async () => {
      // Заявки с агрегацией по счетам
      let requestsQuery = supabase
        .from('requests')
        .select(`
          id, internal_number, project_name, deal_number, created_at,
          invoices(count)
        `)
        .order('created_at', { ascending: false })

      if (role === 'engineer') {
        requestsQuery = requestsQuery.eq('created_by', profile.id)
      }

      const { data: reqData } = await requestsQuery

      // Для подсчета суммы нужен отдельный запрос
      const requestsWithAmount = await Promise.all(
        (reqData || []).map(async (req) => {
          const { data: sumData } = await supabase
            .from('invoices')
            .select('amount')
            .eq('request_id', req.id)
          const total = sumData?.reduce((s, inv) => s + (inv.amount || 0), 0) || 0
          return { ...req, total_amount: total, invoice_count: req.invoices?.[0]?.count || 0 }
        })
      )
      setRequests(requestsWithAmount)

      // Счета без заявки
      let invQuery = supabase
        .from('invoices')
        .select(`
          id, invoice_number, amount, status, created_at,
          counterparty(name),
          request:requests(internal_number)
        `)
        .is('request_id', null)
        .order('created_at', { ascending: false })

      if (role === 'engineer') {
        invQuery = invQuery.eq('created_by', profile.id)
      } else if (role === 'accountant') {
        invQuery = invQuery.in('status', ['approved', 'paid'])
      }

      const { data: invData } = await invQuery
      setStandaloneInvoices(invData || [])
    }
    fetchData()
  }, [supabase, role, profile?.id])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Панель управления</h1>
        <div className="space-x-2">
          <Link href="/dashboard/requests/new">
            <Button>+ Новая заявка</Button>
          </Link>
          <Link href="/dashboard/invoices/new">
            <Button variant="outline">+ Новый счёт (без заявки)</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Заявки</TabsTrigger>
          <TabsTrigger value="invoices">Счета вне заявок</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
          <div className="grid gap-4">
            {requests.length === 0 && <p>Нет заявок</p>}
            {requests.map((req) => (
              <Link key={req.id} href={`/dashboard/requests/${req.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{req.internal_number}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Проект: {req.project_name}</div>
                      <div>Сделка: {req.deal_number}</div>
                      <div>Счетов: {req.invoice_count}</div>
                      <div>Общая сумма: {req.total_amount.toFixed(2)} ₽</div>
                      <div>Создана: {format(new Date(req.created_at), 'dd.MM.yyyy', { locale: ru })}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <div className="grid gap-4">
            {standaloneInvoices.length === 0 && <p>Нет счетов вне заявок</p>}
            {standaloneInvoices.map((inv) => (
              <Card key={inv.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg">Счёт №{inv.invoice_number}</CardTitle>
                    <Badge>
                      {inv.status === 'draft' && 'Черновик'}
                      {inv.status === 'pending_security' && 'На проверке СБ'}
                      {inv.status === 'pending_director' && 'Ожидает директора'}
                      {inv.status === 'approved' && 'Согласован'}
                      {inv.status === 'paid' && 'Оплачен'}
                      {inv.status === 'rejected' && 'Отклонен'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Контрагент: {inv.counterparty?.name}</div>
                    <div>Сумма: {inv.amount.toFixed(2)} ₽</div>
                    <div>Создан: {format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: ru })}</div>
                    <div>
                      {profile?.role !== 'engineer' && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={inv.invoice_url} target="_blank">Просмотр счета</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
