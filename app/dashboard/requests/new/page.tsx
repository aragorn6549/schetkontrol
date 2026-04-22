'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewRequestPage() {
  const [projectName, setProjectName] = useState('')
  const [dealNumber, setDealNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!profile?.id) {
        alert('Ошибка: пользователь не авторизован');
        return;
     }
    setLoading(true);
    const { data, error } = await supabase
       .from('requests')
       .insert({
         project_name: projectName,
         deal_number: dealNumber,
         created_by: profile.id
        })
      .select('id')
      .single()
    if (!error && data) {
      router.push(`/dashboard/requests/${data.id}`)
    } else {
      alert('Ошибка создания заявки')
    }
    setLoading(false)
  }

  if (!profile || (profile.role !== 'engineer' && profile.role !== 'director' && profile.role !== 'accountant')) {
    return <div>Доступ запрещен</div>
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Новая заявка (сделка)</CardTitle>
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать заявку'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
