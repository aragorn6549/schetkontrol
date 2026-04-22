'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'

type RequestSummary = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  created_at: string
  invoice_count: number
  total_amount: number
  created_by?: string
}

type InvoiceSummary = {
  id: string
  invoice_number: string
  amount: number
  invoice_url: string | null
  status: string
  created_at: string
  counterparty: {
    name: string
  } | null
  request: {
    internal_number: string
  } | null
  created_by?: string
}

export function DashboardHome() {
  const [requests, setRequests] = useState<RequestSummary[]>([])
  const [standaloneInvoices, setStandaloneInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createClient()
  const role = profile?.role

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Запрос заявок с агрегацией
        let requestsQuery = supabase
          .from('requests')
          .select(`
            id, internal_number, project_name, deal_number, created_at, created_by,
            invoices ( id )
          `)
          .order('created_at', { ascending: false })

        if (role === 'engineer' && profile?.id) {
          requestsQuery = requestsQuery.eq('created_by', profile.id)
        }

        const { data: reqData, error: reqError } = await requestsQuery
        if (reqError) {
          console.error('Ошибка загрузки заявок:', reqError)
          throw reqError
        }

        // Для каждой заявки считаем сумму счетов отдельно
        const requestsWithAmount: RequestSummary[] = await Promise.all(
          (reqData || []).map(async (req: any) => {
            const { data: sumData, error } = await supabase
              .from('invoices')
              .select('amount')
              .eq('request_id', req.id)

            if (error) console.error('Ошибка получения сумм:', error)
            const total = (sumData || []).reduce((s, inv) => s + (inv.amount || 0), 0)
            return {
              id: req.id,
              internal_number: req.internal_number,
              project_name: req.project_name,
              deal_number: req.deal_number,
              created_at: req.created_at,
              invoice_count: req.invoices?.length || 0,
              total_amount: total,
              created_by: req.created_by
            }
          })
        )
        setRequests(requestsWithAmount)

        // Запрос счетов без заявки
        let invQuery = supabase
          .from('invoices')
          .select(`
            id, invoice_number, amount, invoice_url, status, created_at, created_by,
            counterparties ( name ),
            requests ( internal_number )
          `)
          .is('request_id', null)
          .order('created_at', { ascending: false })

        if (role === 'engineer' && profile?.id) {
          invQuery = invQuery.eq('created_by', profile.id)
        } else if (role === 'accountant') {
          invQuery = invQuery.in('status', ['approved', 'paid'])
        }

        const { data: invData, error: invError } = await invQuery
        if (invError) {
          console.error('Ошибка загрузки счетов:', invError)
          throw invError
        }

        // Преобразуем данные к типу InvoiceSummary
        const formattedInvoices: InvoiceSummary[] = (invData || []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
          invoice_url: inv.invoice_url,
          status: inv.status,
          created_at: inv.created_at,
          counterparty: inv.counterparties ? (Array.isArray(inv.counterparties) ? inv.counterparties[0] : inv.counterparties) : null,
          request: inv.requests ? (Array.isArray(inv.requests) ? inv.requests[0] : inv.requests) : null,
          created_by: inv.created_by
        }))

        setStandaloneInvoices(formattedInvoices)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, role, profile?.id])

  const handleDeleteRequest = async (reqId: string) => {
    if (!confirm('Удалить заявку? Связанные счета останутся, но будут отвязаны.')) return
    const { error } = await supabase.from('requests').delete().eq('id', reqId)
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== reqId))
    } else {
      alert('Ошибка удаления: ' + error.message)
    }
  }

  const handleDeleteInvoice = async (invId: string) => {
    if (!confirm('Удалить счёт?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', invId)
    if (!error) {
      setStandaloneInvoices(prev => prev.filter(i => i.id !== invId))
    } else {
      alert('Ошибка удаления: ' + error.message)
    }
  }

  if (loading) {
    return <div className="p-4">Загрузка данных...</div>
  }

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
              <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer relative">
                <Link href={`/dashboard/requests/${req.id}`} className="block">
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
                </Link>
                {profile?.id === req.created_by && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteRequest(req.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <div className="grid gap-4">
            {standaloneInvoices.length === 0 && <p>Нет счетов вне заявок</p>}
            {standaloneInvoices.map((inv) => (
              <Card key={inv.id} className="relative">
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
                    <div>Контрагент: {inv.counterparty?.name || '—'}</div>
                    <div>Сумма: {inv.amount.toFixed(2)} ₽</div>
                    <div>Создан: {format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: ru })}</div>
                    <div>
                      {profile?.role !== 'engineer' && inv.invoice_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                            Просмотр счета
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
                {profile?.id === inv.created_by && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteInvoice(inv.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
