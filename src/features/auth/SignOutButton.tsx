import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useSignOut } from './api'

export function SignOutButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const signOut = useSignOut()
  const navigate = useNavigate()

  return (
    <Button
      variant={variant}
      disabled={signOut.isPending}
      onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/login') })}
    >
      Cerrar sesión
    </Button>
  )
}
