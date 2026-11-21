import { zodResolver } from '@hookform/resolvers/zod'
import { AuthApiError } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Brand } from '@/app/Brand'
import { useSignIn } from './api'
import { useAuth } from './auth-context'
import { loginSchema, type LoginValues } from './schemas'

function errorMessage(error: unknown): string {
  if (error instanceof AuthApiError && error.code === 'invalid_credentials') {
    return 'Email o contraseña incorrectos.'
  }
  return 'No se pudo iniciar sesión. Probá de nuevo.'
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const signIn = useSignIn()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (!loading && session) return <Navigate to="/" replace />

  const onSubmit = (values: LoginValues) =>
    signIn.mutate(values, { onSuccess: () => navigate('/', { replace: true }) })

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-sidebar p-4 text-sidebar-foreground">
      {/* Franja naranja decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rotate-12 rounded-[3rem] bg-primary/20 blur-2xl"
      />
      <Brand size="lg" className="relative" />
      <Card className="relative w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {signIn.isError && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(signIn.error)}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-2" disabled={signIn.isPending}>
              {signIn.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
