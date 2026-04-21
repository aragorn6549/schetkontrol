'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchJournal = async () => {
      const { data } = await supabase
        .from('journal')
        .select(`
          *,
          profiles:performed_by(full_name)
        `)
        .order('performed_at', { ascending: false })
        .limit(100)
      setEntries(data || [])
    }
    fetchJournal()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Журнал действий</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Время</TableHead>
            <TableHead>Пользователь</TableHead>
            <TableHead>Действие</TableHead>
            <TableHead>Таблица</TableHead>
            <TableHead>ID записи</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{format(new Date(e.performed_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}</TableCell>
              <TableCell>{e.profiles?.full_name || 'Система'}</TableCell>
              <TableCell>{e.action}</TableCell>
              <TableCell>{e.table_name}</TableCell>
              <TableCell>{e.record_id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}