import { createBrowserClient } from '@supabase/ssr'

// Este cliente se usa en los componentes del navegador (Client Components)
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )