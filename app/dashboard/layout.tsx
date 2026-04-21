'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Users, FileText, Building, BookOpen, LogOut } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, signOut, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) return <div className="p-8">Загрузка...</div>
  if (!user) return null

  const role = profile?.role

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Боковое меню */}
      <aside className="w-64 bg-white shadow-md p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-6">СчетКонтоль</h2>
        <nav className="space-y-2 flex-1">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" /> Главная
            </Button>
          </Link>
          {(role === 'engineer' || role === 'director' || role === 'accountant') && (
            <Link href="/dashboard/requests/new">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" /> Новая заявка
              </Button>
            </Link>
          )}
          {role === 'security' || role === 'admin' ? (
            <Link href="/dashboard/counterparties">
              <Button variant="ghost" className="w-full justify-start">
                <Building className="mr-2 h-4 w-4" /> Контрагенты
              </Button>
            </Link>
          ) : null}
          {role === 'admin' && (
            <Link href="/dashboard/admin/users">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> Пользователи
              </Button>
            </Link>
          )}
          <Link href="/dashboard/journal">
            <Button variant="ghost" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" /> Журнал
            </Button>
          </Link>
        </nav>
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">{profile?.full_name} ({role})</p>
          <Button variant="outline" size="sm" onClick={signOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}