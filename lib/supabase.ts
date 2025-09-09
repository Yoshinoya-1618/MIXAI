import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key'

export const createClient = () => {
  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        name: 'sb-auth-token',
        maxAge: 60 * 60 * 8, // 8 hours
        domain: undefined,
        path: '/',
        sameSite: 'lax'
      },
      auth: {
        storageKey: 'supabase.auth.token',
        storage: {
          getItem: (key: string) => {
            try {
              if (typeof window !== 'undefined') {
                return window.localStorage.getItem(key)
              }
              return null
            } catch (error) {
              console.warn('Storage getItem error:', error)
              return null
            }
          },
          setItem: (key: string, value: string) => {
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value)
              }
            } catch (error) {
              console.warn('Storage setItem error:', error)
            }
          },
          removeItem: (key: string) => {
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key)
              }
            } catch (error) {
              console.warn('Storage removeItem error:', error)
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    // フォールバック: 基本的な設定でクライアントを作成
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
}

export const supabase = createClient()