// hooks/use-toast.ts
import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export const toast = ({ title, description, variant = 'default', duration }: ToastProps) => {
  const message = title && description ? `${title}: ${description}` : title || description || ''

  switch (variant) {
    case 'destructive':
      return sonnerToast.error(title || 'Error', {
        description,
        duration,
      })
    case 'success':
      return sonnerToast.success(title || 'Success', {
        description,
        duration,
      })
    default:
      return sonnerToast(title || 'Notification', {
        description,
        duration,
      })
  }
}

// For backwards compatibility with shadcn/ui toast
export const useToast = () => {
  return { toast }
}