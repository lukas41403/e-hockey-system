import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (failureCount, error) => failureCount < 2 && !(error && typeof error === 'object' && 'code' in error),
      refetchOnWindowFocus: true,
    },
  },
  // Mutations show their error as a toast unless they handle it themselves (meta.silent).
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.meta?.silent) return
      toast.error(getErrorMessage(error))
    },
  }),
})

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silent?: boolean }
  }
}
