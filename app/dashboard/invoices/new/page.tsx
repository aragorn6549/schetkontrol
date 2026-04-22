'use client'

import { useAuth } from '@/components/AuthProvider'
import { InvoiceForm } from '@/components/InvoiceForm'

export default function NewStandaloneInvoicePage() {
  const { profile } = useAuth()
  if (!profile) return <div>Загрузка...</div>
  return <InvoiceForm userId={profile.id} />
}
