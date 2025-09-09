import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
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

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      session,
      user: session?.user || null 
    })
  } catch (error: any) {
    console.error('Unexpected session error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}