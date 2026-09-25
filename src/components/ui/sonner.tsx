import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/app/theme'

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      closeButton={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast: '!rounded-lg !border-border !bg-popover !text-popover-foreground !text-base !font-sans',
          error: '!border-destructive/40',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
