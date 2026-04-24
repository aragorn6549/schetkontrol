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
  const [submitting, setSubmitting] = useState(false)
  const { profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) {
      alert('Ошибка: пользователь не авторизован')
      return
    }
    setSubmitting(true)

    const { data: requestId, error } = await supabase.rpc('create_request', {
      p_project_name: projectName,
      p_deal_number: dealNumber,
      p_created_by: profile.id
    })

    if (!error && requestId) {
      router.push(`/dashboard/requests/${requestId}`)
    } else {
      console.error('Ошибка создания заявки:', error)
      alert('Ошибка создания заявки')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-4">Загрузка...</div>

  if (!profile || (profile.role !== 'engineer' && profile.role !== 'director' && profile.role !== 'accountant')) {
    return <div className="p-4 text-red-500">Доступ запрещен</div>
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
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Создание...' : 'Создать заявку'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
