import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export const createServerSupabaseClient = (request: NextRequest) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {}
      }
    }
  )
}