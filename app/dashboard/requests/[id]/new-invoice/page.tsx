'use client'

import { useAuth } from '@/components/AuthProvider'
import { InvoiceForm } from '@/components/InvoiceForm'
import { useParams } from 'next/navigation'

export default function NewInvoicePage() {
  const { profile } = useAuth()
  const { id } = useParams()
  
  if (!profile) return <div>Загрузка...</div>
  
  return <InvoiceForm userId={profile.id} defaultRequestId={id as string} />
}
