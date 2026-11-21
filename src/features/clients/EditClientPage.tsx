import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldError, useClient, useSetClientActive, useUpdateClient, type ClientRow } from './api'
import { FormField } from './FormField'
import { updateClientSchema, type UpdateClientValues } from './schemas'

export function EditClientPage() {
  const { id } = useParams()
  const client = useClient(id)

  if (client.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (client.isError) return <p className="text-sm text-destructive">No se encontró el cliente.</p>
  return <EditClientForm client={client.data} />
}

function EditClientForm({ client }: { client: ClientRow }) {
  const updateClient = useUpdateClient(client.id)
  const setActive = useSetClientActive(client.id)
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateClientValues>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      nombre: client.nombre,
      apellido: client.apellido,
      dni: client.dni ?? '',
      telefono: client.telefono ?? '',
      notas: client.notas ?? '',
    },
  })

  const onSubmit = (values: UpdateClientValues) =>
    updateClient.mutate(values, {
      onSuccess: () => navigate(`/admin/clientes/${client.id}`),
      onError: (error) => {
        // En la edición el único campo único editable es el DNI.
        if (error instanceof FieldError) setError('dni', { message: error.message })
      },
    })

  const toggleActive = () => {
    const message = client.activo
      ? `¿Dar de baja a ${client.nombre} ${client.apellido}? No podrá entrar a la app. Sus datos se conservan.`
      : `¿Reactivar a ${client.nombre} ${client.apellido}?`
    if (window.confirm(message)) setActive.mutate(!client.activo)
  }

  const unexpectedError = updateClient.isError && !(updateClient.error instanceof FieldError)

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">
          {client.apellido}, {client.nombre}
        </h1>
        {!client.activo && <Badge variant="secondary">Inactivo</Badge>}
      </div>

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
        <FormField id="email" label="Email (usuario para entrar)">
          <Input id="email" value={client.email ?? ''} disabled readOnly />
        </FormField>
        <FormField id="notas" label="Notas (lesiones, observaciones)">
          <Textarea id="notas" {...register('notas')} />
        </FormField>

        {unexpectedError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudieron guardar los cambios. Probá de nuevo.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={updateClient.isPending}>
            {updateClient.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link
            to={`/admin/clientes/${client.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Volver
          </Link>
        </div>
      </form>

      <div className="flex flex-col items-start gap-2 border-t pt-4">
        <Button
          variant={client.activo ? 'destructive' : 'secondary'}
          disabled={setActive.isPending}
          onClick={toggleActive}
        >
          {client.activo ? 'Dar de baja' : 'Reactivar'}
        </Button>
        {setActive.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo actualizar el estado. Probá de nuevo.
          </p>
        )}
      </div>
    </div>
  )
}
