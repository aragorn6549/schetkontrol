'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  full_name: string
  role: string
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  signOut: async () => {},
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Ошибка загрузки профиля:', error.message)
        // В случае ошибки можно попробовать перезагрузить сессию или выйти
        // Пока просто ставим null, чтобы интерфейс не зависал
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Неожиданная ошибка загрузки профиля:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
        if (user) {
          await fetchProfile(user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      } catch (err) {
        // Невалидная/истёкшая сессия в куках — сбрасываем состояние
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }
    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
      router.refresh()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
