'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Counterparty = {
  id: string
  name: string
  inn: string
  status: string
}

export function RequestForm({ userId }: { userId: string }) {
  const [projectName, setProjectName] = useState('')
  const [dealNumber, setDealNumber] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('')
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(false)
  const [newCounterparty, setNewCounterparty] = useState({ name: '', inn: '', kpp: '', address: '' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchCounterparties = async () => {
      const { data } = await supabase.from('counterparties').select('id, name, inn, status')
      setCounterparties(data || [])
    }
    fetchCounterparties()
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
  setLoading(true)

  // Используем RPC вызов вместо прямой вставки
  const { data, error } = await supabase.rpc('create_request', {
    p_project_name: projectName,
    p_deal_number: dealNumber,
    p_supplier_invoice_number: supplierInvoiceNumber,
    p_invoice_url: invoiceUrl,
    p_counterparty_id: selectedCounterpartyId,
    p_created_by: userId
  })

  if (!error) {
    router.push('/dashboard')
    router.refresh()
  } else {
    console.error('Ошибка создания заявки:', error)
    alert(`Ошибка создания заявки: ${error.message}`)
  }
  setLoading(false)
}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая заявка на оплату</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название проекта</Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
          </div>
          <div>
            <Label>Номер сделки</Label>
            <Input value={dealNumber} onChange={(e) => setDealNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Номер счета поставщика</Label>
            <Input value={supplierInvoiceNumber} onChange={(e) => setSupplierInvoiceNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Ссылка на файл счета (URL)</Label>
            <Input type="url" value={invoiceUrl} onChange={(e) => setInvoiceUrl(e.target.value)} required />
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
                
                <DialogContent aria-describedby="new-counterparty-description">
                  <DialogHeader>
                    <DialogTitle>Новый контрагент</DialogTitle>
                  </DialogHeader>
                  <div id="new-counterparty-description" className="sr-only">
                    Форма создания нового контрагента. Заполните все обязательные поля.
                  </div>
                  
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
            {loading ? 'Создание...' : 'Создать заявку'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
