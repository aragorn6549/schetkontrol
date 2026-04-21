'use client'

import { useAuth } from '@/components/AuthProvider'
import { RequestForm } from '@/components/RequestForm'
import { redirect } from 'next/navigation'

export default function NewRequestPage() {
  const { profile, loading } = useAuth()
  if (loading) return <div>Загрузка...</div>
  if (!profile || (profile.role !== 'engineer' && profile.role !== 'director' && profile.role !== 'accountant')) {
    redirect('/dashboard')
  }
  return <RequestForm userId={profile.id} />
}