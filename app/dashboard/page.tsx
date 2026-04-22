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
import { FileText, Receipt, Plus } from 'lucide-react'

type RequestSummary = {
  id: string
  internal_number: string
  project_name: string
  deal_number: string
  created_at: string
  invoice_count: number
  total_amount: number
  status_summary: string
}

type InvoiceSummary = {
  id: string
  invoice_number: string
  amount: number
  invoice_url: string
  status: string
  created_at: string
  counterparty: { 
    id: string
    name: string 
    inn: string
    status: string
  } | null
  request: { 
    id: string
    internal_number: string 
  } | null
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<RequestSummary[]>([])
  const [standaloneInvoices, setStandaloneInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createClient()
  const role = profile?.role

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      // Запрос заявок
      let requestsQuery = supabase
        .from('requests')
        .select(`
          id, 
          internal_number, 
          project_name, 
          deal_number, 
          created_at,
          invoices(
            id, 
            amount, 
            status
          )
        `)
        .order('created_at', { ascending: false })

      if (role === 'engineer') {
        requestsQuery = requestsQuery.eq('created_by', profile?.id)
      }

      const { data: reqData, error: reqError } = await requestsQuery

      if (!reqError && reqData) {
        // Обработка данных заявок
        const processedRequests = reqData.map((req: any) => {
          const invoices = req.invoices || []
          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
          
          // Определяем статус заявки на основе статусов счетов
          let statusSummary = 'draft'
          const statuses = invoices.map((inv: any) => inv.status)
          
          if (statuses.length === 0) {
            statusSummary = 'empty'
          } else if (statuses.every((s: string) => s === 'paid')) {
            statusSummary = 'paid'
          } else if (statuses.some((s: string) => s === 'rejected')) {
            statusSummary = 'rejected'
          } else if (statuses.some((s: string) => s === 'pending_security')) {
            statusSummary = 'pending_security'
          } else if (statuses.some((s: string) => s === 'pending_director')) {
            statusSummary = 'pending_director'
          } else if (statuses.every((s: string) => s === 'approved')) {
            statusSummary = 'approved'
          }

          return {
            id: req.id,
            internal_number: req.internal_number,
            project_name: req.project_name,
            deal_number: req.deal_number,
            created_at: req.created_at,
            invoice_count: invoices.length,
            total_amount: totalAmount,
            status_summary: statusSummary
          }
        })
        setRequests(processedRequests)
      }

      // Запрос счетов без заявки
      let invQuery = supabase
        .from('invoices')
        .select(`
          id, 
          invoice_number, 
          amount, 
          invoice_url,
          status, 
          created_at,
          counterparty:counterparties(id, name, inn, status),
          request:requests(id, internal_number)
        `)
        .is('request_id', null)
        .order('created_at', { ascending: false })

      if (role === 'engineer') {
        invQuery = invQuery.eq('created_by', profile?.id)
      } else if (role === 'accountant') {
        invQuery = invQuery.in('status', ['approved', 'paid'])
      }

      const { data: invData } = await invQuery
      setStandaloneInvoices(invData || [])
      
      setLoading(false)
    }

    if (profile) {
      fetchData()
    }
  }, [supabase, role, profile])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      empty: { label: 'Пустая заявка', variant: 'secondary' },
      draft: { label: 'Черновик', variant: 'secondary' },
      pending_security: { label: 'На проверке СБ', variant: 'secondary' },
      pending_director: { label: 'Ожидает директора', variant: 'secondary' },
      approved: { label: 'Согласована', variant: 'default' },
      paid: { label: 'Оплачена', variant: 'default' },
      rejected: { label: 'Отклонена', variant: 'destructive' }
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getInvoiceStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Черновик', variant: 'secondary' },
      pending_security: { label: 'На проверке СБ', variant: 'secondary' },
      pending_director: { label: 'Ожидает директора', variant: 'secondary' },
      approved: { label: 'Согласован', variant: 'default' },
      paid: { label: 'Оплачен', variant: 'default' },
      rejected: { label: 'Отклонен', variant: 'destructive' }
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Загрузка данных...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки действий */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Панель управления</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'engineer' && 'Создавайте заявки и счета, отслеживайте статусы'}
            {role === 'director' && 'Согласование счетов и контроль сделок'}
            {role === 'accountant' && 'Отметка оплат и работа со счетами'}
            {role === 'security' && 'Проверка контрагентов'}
            {role === 'admin' && 'Полный контроль системы'}
          </p>
        </div>
        {(role === 'engineer' || role === 'director' || role === 'accountant' || role === 'admin') && (
          <div className="flex gap-2">
            <Link href="/dashboard/requests/new">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Новая заявка
              </Button>
            </Link>
            <Link href="/dashboard/invoices/new">
              <Button variant="outline">
                <Receipt className="mr-2 h-4 w-4" />
                Новый счёт
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Вкладки: Заявки / Счета вне заявок */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            Заявки ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Счета вне заявок ({standaloneInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Вкладка с заявками */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет заявок</h3>
                <p className="text-muted-foreground mb-4">
                  Создайте первую заявку, чтобы начать работу
                </p>
                <Link href="/dashboard/requests/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать заявку
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((req) => (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {req.internal_number}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {req.project_name} / Сделка №{req.deal_number}
                          </p>
                        </div>
                        {getStatusBadge(req.status_summary)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Счетов</p>
                          <p className="font-medium">{req.invoice_count} шт.</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Общая сумма</p>
                          <p className="font-medium text-lg">
                            {req.total_amount.toFixed(2)} ₽
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Дата создания</p>
                          <p className="font-medium">
                            {format(new Date(req.created_at), 'dd.MM.yyyy', { locale: ru })}
                          </p>
                        </div>
                        <div className="flex items-end justify-end">
                          <Button variant="ghost" size="sm">
                            Подробнее →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Вкладка со счетами вне заявок */}
        <TabsContent value="invoices" className="space-y-4">
          {standaloneInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет счетов вне заявок</h3>
                <p className="text-muted-foreground mb-4">
                  Создайте счёт без привязки к заявке
                </p>
                <Link href="/dashboard/invoices/new">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Создать счёт
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {standaloneInvoices.map((inv) => (
                <Card key={inv.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          Счёт №{inv.invoice_number}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {inv.counterparty ? (
                            <span>
                              {inv.counterparty.name} (ИНН {inv.counterparty.inn})
                              {inv.counterparty.status === 'approved' && ' ✅'}
                              {inv.counterparty.status === 'pending' && ' ⏳'}
                              {inv.counterparty.status === 'rejected' && ' ❌'}
                            </span>
                          ) : (
                            'Контрагент не указан'
                          )}
                        </p>
                      </div>
                      {getInvoiceStatusBadge(inv.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Сумма</p>
                        <p className="font-medium text-lg">
                          {inv.amount.toFixed(2)} ₽
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Дата создания</p>
                        <p className="font-medium">
                          {format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        {role !== 'engineer' && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                              Просмотр счета
                            </a>
                          </Button>
                        )}
                        {role === 'engineer' && inv.status === 'approved' && (
                          <Button size="sm" variant="secondary">
                            Запросить ПП
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
