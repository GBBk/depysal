import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSignOut } from './api'

export function SignOutButton({
  variant = 'outline',
  iconOnly = false,
  className,
}: {
  variant?: 'outline' | 'ghost'
  iconOnly?: boolean
  className?: string
}) {
  const signOut = useSignOut()
  const navigate = useNavigate()

  return (
    <Button
      variant={variant}
      size={iconOnly ? 'icon' : 'default'}
      className={cn(iconOnly ? undefined : 'gap-2', className)}
      disabled={signOut.isPending}
      aria-label={iconOnly ? 'Cerrar sesión' : undefined}
      title={iconOnly ? 'Cerrar sesión' : undefined}
      onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/login') })}
    >
      <LogOut />
      {!iconOnly && 'Cerrar sesión'}
    </Button>
  )
}
