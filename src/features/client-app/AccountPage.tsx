import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-context'
import { useProfile } from '@/features/auth/api'
import { FormField } from '@/features/clients/FormField'
import { useChangePassword } from './api'
import { passwordSchema, type PasswordValues } from './logic'

/** Cuenta del cliente: sus datos y cambiar la contraseña (lo único que puede editar). */
export function AccountPage() {
  const { session } = useAuth()
  const profile = useProfile()
  const change = useChangePassword()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = (values: PasswordValues) =>
    change.mutate(values.password, { onSuccess: () => reset() })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Cuenta</h1>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <span className="font-semibold">
            {profile.data ? `${profile.data.nombre} ${profile.data.apellido}` : '…'}
          </span>
          <span className="text-sm text-muted-foreground">{session?.user.email}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField id="password" label="Nueva contraseña" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
            </FormField>
            <FormField id="confirm" label="Repetí la contraseña" error={errors.confirm?.message}>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...register('confirm')}
              />
            </FormField>
            {change.isError && (
              <p role="alert" className="text-sm text-destructive">
                No se pudo cambiar la contraseña. Probá con otra o intentá más tarde.
              </p>
            )}
            {change.isSuccess && (
              <p role="status" className="text-sm text-emerald-700">
                Listo: tu contraseña cambió.
              </p>
            )}
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
