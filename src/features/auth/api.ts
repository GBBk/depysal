import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'
import type { LoginValues } from './schemas'

/** Profile del usuario logueado (el RLS solo le deja leer el propio). */
export function useProfile() {
  const { session } = useAuth()
  const userId = session?.user.id

  return useQuery({
    queryKey: ['profile', userId],
    enabled: userId !== undefined,
    queryFn: async () => {
      if (!userId) throw new Error('Sin sesión')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, rol, nombre, apellido, activo')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: LoginValues) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSettled: () => queryClient.clear(),
  })
}
