import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FormField } from '@/features/clients/FormField'
import { usePlans } from '@/features/plans/api'
import { formatMoney, todayISO } from '@/lib/format'
import { useCreatePayment } from './api'
import { medioLabels, medios, paymentSchema, type PaymentValues } from './schemas'

export function PaymentForm({ clientId }: { clientId: string }) {
  const plans = usePlans()
  const createPayment = useCreatePayment(clientId)
  const activePlans = plans.data?.filter((p) => p.activo) ?? []

  const emptyValues = (): PaymentValues => ({
    plan_id: '',
    monto: '',
    medio: 'efectivo',
    fecha_pago: todayISO(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: emptyValues(),
  })

  // El monto arranca en el precio del plan elegido; se puede editar.
  const planField = register('plan_id', {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const plan = activePlans.find((p) => String(p.id) === e.target.value)
      if (plan) setValue('monto', String(plan.precio), { shouldValidate: true })
    },
  })

  const onSubmit = (values: PaymentValues) =>
    createPayment.mutate(values, { onSuccess: () => reset(emptyValues()) })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="pago-plan" label="Plan" error={errors.plan_id?.message}>
          <NativeSelect id="pago-plan" className="w-full" {...planField}>
            <NativeSelectOption value="">Elegí un plan</NativeSelectOption>
            {activePlans.map((p) => (
              <NativeSelectOption key={p.id} value={String(p.id)}>
                {p.nombre} · {formatMoney(p.precio)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="pago-monto" label="Monto ($)" error={errors.monto?.message}>
          <Input id="pago-monto" inputMode="decimal" {...register('monto')} />
        </FormField>
        <FormField id="pago-medio" label="Medio" error={errors.medio?.message}>
          <NativeSelect id="pago-medio" className="w-full" {...register('medio')}>
            {medios.map((m) => (
              <NativeSelectOption key={m} value={m}>
                {medioLabels[m]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="pago-fecha" label="Fecha de pago" error={errors.fecha_pago?.message}>
          <Input id="pago-fecha" type="date" {...register('fecha_pago')} />
        </FormField>
      </div>
      {createPayment.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo registrar el pago. Probá de nuevo.
        </p>
      )}
      <div>
        <Button type="submit" disabled={createPayment.isPending}>
          {createPayment.isPending ? 'Registrando…' : 'Registrar pago'}
        </Button>
      </div>
    </form>
  )
}
