'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function CounterpartiesPage() {
  const [counterparties, setCounterparties] = useState<any[]>([])
  const { profile } = useAuth()
  const supabase = createClient()
  const canEdit = profile?.role === 'security' || profile?.role === 'admin'

  const fetchData = async () => {
    const { data } = await supabase.from('counterparties').select('*').order('created_at', { ascending: false })
    setCounterparties(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!canEdit) return
    await supabase
      .from('counterparties')
      .update({
        status,
        verified_by: profile?.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', id)
    fetchData()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Справочник контрагентов</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Наименование</TableHead>
            <TableHead>ИНН</TableHead>
            <TableHead>КПП</TableHead>
            <TableHead>Адрес</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Создан</TableHead>
            {canEdit && <TableHead>Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {counterparties.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.inn}</TableCell>
              <TableCell>{c.kpp || '-'}</TableCell>
              <TableCell>{c.address || '-'}</TableCell>
              <TableCell>
                <Badge variant={c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {c.status === 'approved' ? 'Одобрен' : c.status === 'rejected' ? 'Отклонен' : 'На проверке'}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(c.created_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
              {canEdit && (
                <TableCell>
                  {c.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateStatus(c.id, 'approved')}>Одобрить</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(c.id, 'rejected')}>Отклонить</Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}