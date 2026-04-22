'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Counterparty = {
  id: string
  name: string
  inn: string
  status: string
}

type RequestOption = {
  id: string
  internal_number: string
}

export function InvoiceForm({ userId, defaultRequestId }: { userId: string; defaultRequestId?: string }) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('')
  const [selectedRequestId, setSelectedRequestId] = useState<string>(defaultRequestId || '')
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [requests, setRequests] = useState<RequestOption[]>([])
  const [loading, setLoading] = useState(false)
  const [newCounterparty, setNewCounterparty] = useState({ name: '', inn: '', kpp: '', address: '' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cp }, { data: req }] = await Promise.all([
        supabase.from('counterparties').select('id, name, inn, status'),
        supabase.from('requests').select('id, internal_number').order('created_at', { ascending: false })
      ])
      setCounterparties(cp || [])
      setRequests(req || [])
    }
    fetchData()
  }, [supabase])

  const handleCreateCounterparty = async () => {
    const { data, error } = await supabase
      .from('counterparties')
      .insert({
        ...newCounterparty,
        created_by: userId,
        status: 'pending'
      })
      .select()
      .single()
    if (!error && data) {
      setCounterparties([...counterparties, data])
      setSelectedCounterpartyId(data.id)
      setDialogOpen(false)
      setNewCounterparty({ name: '', inn: '', kpp: '', address: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCounterpartyId) return alert('Выберите или создайте контрагента')
    if (!amount || parseFloat(amount) <= 0) return alert('Введите корректную сумму')
    setLoading(true)

    const { error } = await supabase.rpc('create_invoice', {
      p_request_id: selectedRequestId || null,
      p_counterparty_id: selectedCounterpartyId,
      p_invoice_number: invoiceNumber,
      p_amount: parseFloat(amount),
      p_invoice_url: invoiceUrl,
      p_created_by: userId
    })

    if (!error) {
      if (selectedRequestId) {
        router.push(`/dashboard/requests/${selectedRequestId}`)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } else {
      console.error('Ошибка создания счета:', error)
      alert(`Ошибка: ${error.message}`)
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новый счёт</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Номер счёта поставщика</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Сумма (руб.)</Label>
            <Input 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              required 
            />
          </div>
          <div>
            <Label>Ссылка на файл счёта (URL)</Label>
            <Input type="url" value={invoiceUrl} onChange={(e) => setInvoiceUrl(e.target.value)} required />
          </div>
          <div>
            <Label>Привязать к заявке (опционально)</Label>
            <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите заявку (или оставьте пустым)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без заявки</SelectItem>
                {requests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.internal_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Контрагент</Label>
            <div className="flex gap-2">
              <Select value={selectedCounterpartyId} onValueChange={setSelectedCounterpartyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите контрагента" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (ИНН {c.inn}) {c.status === 'approved' ? '✅' : '⏳'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">Новый</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Новый контрагент</DialogTitle>
                    <DialogDescription>
                      Заполните реквизиты. После создания контрагент будет отправлен на проверку в СБ.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Наименование" value={newCounterparty.name} onChange={(e) => setNewCounterparty({...newCounterparty, name: e.target.value})} />
                    <Input placeholder="ИНН" value={newCounterparty.inn} onChange={(e) => setNewCounterparty({...newCounterparty, inn: e.target.value})} />
                    <Input placeholder="КПП" value={newCounterparty.kpp} onChange={(e) => setNewCounterparty({...newCounterparty, kpp: e.target.value})} />
                    <Input placeholder="Адрес" value={newCounterparty.address} onChange={(e) => setNewCounterparty({...newCounterparty, address: e.target.value})} />
                    <Button onClick={handleCreateCounterparty}>Сохранить</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать счёт'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
