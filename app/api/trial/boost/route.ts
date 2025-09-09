import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await request.json()
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is on trial
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!subscription || subscription.status !== 'trialing') {
      return NextResponse.json({ 
        boostGranted: false,
        message: 'User is not on trial' 
      })
    }

    // Grant Creator Boost (48 hours)
    const boostUntil = new Date()
    boostUntil.setHours(boostUntil.getHours() + 48)

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        creator_boost_until: boostUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to grant Creator Boost:', updateError)
      return NextResponse.json({ 
        boostGranted: false,
        error: 'Failed to grant boost' 
      }, { status: 500 })
    }

    // Log the boost grant
    await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        amount: 0,
        balance_after: 0,
        type: 'grant',
        bucket: 'trial',
        description: 'Creator Boost (48時間)',
        metadata: { 
          boost_until: boostUntil.toISOString(),
          session_id: sessionId
        }
      })

    return NextResponse.json({ 
      boostGranted: true,
      boostUntil: boostUntil.toISOString(),
      message: 'Creator Boost granted for 48 hours'
    })
  } catch (error) {
    console.error('Boost grant error:', error)
    return NextResponse.json({ 
      boostGranted: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}