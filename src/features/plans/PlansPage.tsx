import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/features/clients/FormField'
import { usePlans, useSetPlanActive, useUpdatePlan, type Plan } from './api'
import { planSchema, toPlanValues, type PlanValues } from './schemas'

export function PlansPage() {
  const plans = usePlans()

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Planes</h1>
      <p className="text-sm text-muted-foreground">
        Los cambios valen para los pagos nuevos: los períodos ya pagados conservan las clases que
        tenía el plan al momento del pago.
      </p>
      {plans.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {plans.isError && (
        <p className="text-sm text-destructive">No se pudieron cargar los planes.</p>
      )}
      {plans.data?.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const updatePlan = useUpdatePlan(plan.id)
  const setActive = useSetPlanActive(plan.id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: toPlanValues(plan),
  })

  const onSubmit = (values: PlanValues) =>
    updatePlan.mutate(values, { onSuccess: () => reset(values) })

  const id = (field: string) => `plan-${plan.id}-${field}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.nombre}
          {!plan.activo && <Badge variant="secondary">Inactivo</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={id('nombre')} label="Nombre" error={errors.nombre?.message}>
              <Input id={id('nombre')} {...register('nombre')} />
            </FormField>
            <FormField id={id('precio')} label="Precio ($)" error={errors.precio?.message}>
              <Input id={id('precio')} inputMode="decimal" {...register('precio')} />
            </FormField>
            <FormField id={id('clases')} label="Clases por período" error={errors.clases?.message}>
              <Input
                id={id('clases')}
                inputMode="numeric"
                placeholder="Ilimitadas"
                {...register('clases')}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Dejá las clases vacías para un pase libre (clases ilimitadas).
          </p>
          {updatePlan.isError && (
            <p role="alert" className="text-sm text-destructive">
              No se pudo guardar. Probá de nuevo.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!isDirty || updatePlan.isPending}>
              {updatePlan.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={setActive.isPending}
              onClick={() => setActive.mutate(!plan.activo)}
            >
              {plan.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
