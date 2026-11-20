import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldError, useCreateClient } from './api'
import { FormField } from './FormField'
import { createClientSchema, type CreateClientValues } from './schemas'

export function NewClientPage() {
  const createClient = useCreateClient()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      telefono: '',
      email: '',
      notas: '',
      password: '',
    },
  })

  const onSubmit = (values: CreateClientValues) =>
    createClient.mutate(values, {
      onSuccess: () => navigate('/admin/clientes'),
      onError: (error) => {
        if (error instanceof FieldError) setError(error.field, { message: error.message })
      },
    })

  const unexpectedError = createClient.isError && !(createClient.error instanceof FieldError)

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold">Nuevo cliente</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
            <Input id="nombre" {...register('nombre')} />
          </FormField>
          <FormField id="apellido" label="Apellido" error={errors.apellido?.message}>
            <Input id="apellido" {...register('apellido')} />
          </FormField>
          <FormField id="dni" label="DNI" error={errors.dni?.message}>
            <Input id="dni" inputMode="numeric" {...register('dni')} />
          </FormField>
          <FormField id="telefono" label="Teléfono" error={errors.telefono?.message}>
            <Input id="telefono" type="tel" {...register('telefono')} />
          </FormField>
        </div>
        <FormField id="email" label="Email (usuario para entrar)" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="off" {...register('email')} />
        </FormField>
        <FormField id="password" label="Contraseña inicial" error={errors.password?.message}>
          <Input id="password" type="text" autoComplete="off" {...register('password')} />
        </FormField>
        <FormField id="notas" label="Notas (lesiones, observaciones)">
          <Textarea id="notas" {...register('notas')} />
        </FormField>

        {unexpectedError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo crear el cliente. Probá de nuevo.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={createClient.isPending}>
            {createClient.isPending ? 'Guardando…' : 'Crear cliente'}
          </Button>
          <Link to="/admin/clientes" className={buttonVariants({ variant: 'outline' })}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
