import { zodResolver } from '@hookform/resolvers/zod'
import { AuthApiError } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Depysal</CardTitle>
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
            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
