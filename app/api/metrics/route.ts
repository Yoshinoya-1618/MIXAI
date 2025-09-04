import { NextRequest, NextResponse } from 'next/server'

// Prometheus形式のメトリクス生成
function generateMetrics() {
  const now = Date.now()
  const metrics = []
  
  // アプリケーションの稼働時間
  const uptime = process.uptime()
  metrics.push(`mixai_uptime_seconds ${uptime}`)
  
  // メモリ使用量
  const memUsage = process.memoryUsage()
  metrics.push(`mixai_memory_rss_bytes ${memUsage.rss}`)
  metrics.push(`mixai_memory_heap_used_bytes ${memUsage.heapUsed}`)
  metrics.push(`mixai_memory_heap_total_bytes ${memUsage.heapTotal}`)
  metrics.push(`mixai_memory_external_bytes ${memUsage.external}`)
  
  // イベントループ情報
  metrics.push(`mixai_event_loop_delay_ms ${0}`) // 実装時に適切な値を設定
  
  // Node.js バージョン情報
  metrics.push(`mixai_nodejs_version_info{version="${process.version}"} 1`)
  
  // 環境情報
  metrics.push(`mixai_environment_info{env="${process.env.NODE_ENV}"} 1`)
  
  // タイムスタンプ
  metrics.push(`mixai_last_update_timestamp ${now}`)
  
  return metrics.join('\n') + '\n'
}

export async function GET(request: NextRequest) {
  try {
    // メトリクス生成
    const metricsText = generateMetrics()
    
    return new Response(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Metrics endpoint error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    )
  }
}