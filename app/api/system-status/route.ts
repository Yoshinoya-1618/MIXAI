import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 現在のシステム状態を取得
    const services = await checkServices()
    
    // 過去90日間の稼働履歴を取得
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { data: uptimeHistory, error } = await supabase
      .from('system_status')
      .select('*')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching uptime history:', error)
    }
    
    // 稼働率を計算
    const uptimePercentage = calculateUptime(uptimeHistory || [])
    
    return NextResponse.json({
      services,
      uptimeHistory: uptimeHistory || [],
      uptimePercentage,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('System status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // システム状態を記録（cronジョブから呼ばれる想定）
    const services = await checkServices()
    
    // Supabaseに記録
    const { error } = await supabase
      .from('system_status')
      .insert({
        services: services,
        timestamp: new Date().toISOString(),
        overall_status: getOverallStatus(services)
      })
    
    if (error) {
      console.error('Error recording system status:', error)
      return NextResponse.json(
        { error: 'Failed to record system status' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('System status recording error:', error)
    return NextResponse.json(
      { error: 'Failed to record system status' },
      { status: 500 }
    )
  }
}

async function checkServices() {
  const services = []
  
  // Web アプリケーション
  try {
    const start = Date.now()
    const response = await fetch(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    const responseTime = Date.now() - start
    
    services.push({
      name: 'Web アプリケーション',
      status: response.ok ? 'operational' : 'degraded',
      responseTime: `${responseTime}ms`
    })
  } catch (error) {
    services.push({
      name: 'Web アプリケーション',
      status: 'outage',
      responseTime: 'N/A'
    })
  }
  
  // API
  try {
    const start = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`, {
      signal: AbortSignal.timeout(5000)
    })
    const responseTime = Date.now() - start
    
    services.push({
      name: 'API',
      status: response.ok ? 'operational' : 'degraded',
      responseTime: `${responseTime}ms`
    })
  } catch (error) {
    services.push({
      name: 'API',
      status: 'outage',
      responseTime: 'N/A'
    })
  }
  
  // Supabase Database
  try {
    const start = Date.now()
    const { error } = await supabase
      .from('system_status')
      .select('count')
      .limit(1)
      .single()
    const responseTime = Date.now() - start
    
    services.push({
      name: 'データベース',
      status: error ? 'degraded' : 'operational',
      responseTime: `${responseTime}ms`
    })
  } catch (error) {
    services.push({
      name: 'データベース',
      status: 'outage',
      responseTime: 'N/A'
    })
  }
  
  // Storage
  try {
    const start = Date.now()
    const { data, error } = await supabase.storage
      .from('uploads')
      .list('', { limit: 1 })
    const responseTime = Date.now() - start
    
    services.push({
      name: 'ファイルストレージ',
      status: error ? 'degraded' : 'operational',
      responseTime: `${responseTime}ms`
    })
  } catch (error) {
    services.push({
      name: 'ファイルストレージ',
      status: 'outage',
      responseTime: 'N/A'
    })
  }
  
  // MIX処理エンジン（ダミー）
  services.push({
    name: 'MIX処理エンジン',
    status: 'operational',
    responseTime: '2.1s',
    uptime: '99.95%'
  })
  
  return services
}

function getOverallStatus(services: any[]) {
  if (services.some(s => s.status === 'outage')) {
    return 'outage'
  }
  if (services.some(s => s.status === 'degraded')) {
    return 'degraded'
  }
  return 'operational'
}

function calculateUptime(history: any[]) {
  if (!history || history.length === 0) {
    return 100
  }
  
  const totalChecks = history.length
  const operationalChecks = history.filter(h => h.overall_status === 'operational').length
  
  return ((operationalChecks / totalChecks) * 100).toFixed(2)
}