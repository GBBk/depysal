import { FunctionsHttpError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreateClientValues, UpdateClientValues } from './schemas'

const clientColumns = 'id, nombre, apellido, dni, telefono, email, notas, activo'

/** Error de validación que viene de la base o de la Edge Function, atado a un campo. */
export class FieldError extends Error {
  readonly field: 'email' | 'dni'
  constructor(field: 'email' | 'dni', message: string) {
    super(message)
    this.field = field
  }
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505'
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(clientColumns)
        .eq('rol', 'client')
        .order('apellido')
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export type ClientRow = NonNullable<ReturnType<typeof useClients>['data']>[number]

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['clients', id],
    enabled: id !== undefined,
    queryFn: async () => {
      if (!id) throw new Error('Falta el id')
      const { data, error } = await supabase
        .from('profiles')
        .select(clientColumns)
        .eq('id', id)
        .eq('rol', 'client')
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CreateClientValues) => {
      const { data, error } = await supabase.functions.invoke<{ id: string }>('create-client', {
        body: values,
      })
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const body: unknown = await error.context.json().catch(() => null)
          if (body && typeof body === 'object' && 'field' in body && 'error' in body) {
            const { field, error: message } = body
            if ((field === 'email' || field === 'dni') && typeof message === 'string') {
              throw new FieldError(field, message)
            }
          }
        }
        throw error
      }
      if (!data) throw new Error('Respuesta vacía')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: UpdateClientValues) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...values,
          telefono: values.telefono || null,
          notas: values.notas || null,
        })
        .eq('id', id)
      if (error) {
        if (isUniqueViolation(error))
          throw new FieldError('dni', 'Ya existe un cliente con ese DNI')
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

/** Baja lógica (activo = false) o reactivación. Nunca se borran clientes. */
export function useSetClientActive(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (activo: boolean) => {
      const { error } = await supabase.from('profiles').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}
