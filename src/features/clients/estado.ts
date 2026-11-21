export type Estado = 'al_dia' | 'por_vencer' | 'vencido'

export const estados: Estado[] = ['al_dia', 'por_vencer', 'vencido']

export const estadoLabels: Record<Estado, string> = {
  al_dia: 'Al día',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
}

export function isEstado(value: unknown): value is Estado {
  return value === 'al_dia' || value === 'por_vencer' || value === 'vencido'
}
