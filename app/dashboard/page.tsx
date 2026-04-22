'use client'

import { useAuth } from '@/components/AuthProvider'
import { RequestList } from '@/components/RequestList'

export default function DashboardPage() {
  const { profile } = useAuth()
  const role = profile?.role

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Заявки</h1>
      <RequestList role={role!} userId={profile?.id} />
    </div>
  )
}
