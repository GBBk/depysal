import { useQuery } from '@tanstack/react-query'

export function HomePage() {
  // Verifica la conexión con Supabase local (T01). Se reemplaza en T03 por el login.
  const { data: connected, isPending } = useQuery({
    queryKey: ['supabase-health'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      })
      return res.ok
    },
  })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-3xl font-bold">Hola, Depysal</h1>
      <p className="text-sm text-muted-foreground">
        Supabase: {isPending ? 'verificando…' : connected ? 'conectado' : 'error de conexión'}
      </p>
    </main>
  )
}
