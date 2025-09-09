#!/usr/bin/env node
// scripts/schedule-training.js
// 定期的な学習ジョブのスケジューリング

import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'
import { scheduleTrainingJobs } from '../worker/training.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 毎週日曜日の午前3時に実行
const CRON_SCHEDULE = '0 3 * * 0'

console.log('🕒 Starting ML training scheduler')
console.log(`   Schedule: ${CRON_SCHEDULE}`)

// 定期実行の設定
cron.schedule(CRON_SCHEDULE, async () => {
  console.log('⏰ Running scheduled training jobs')
  
  try {
    await scheduleTrainingJobs()
    console.log('✅ Scheduled training completed')
  } catch (error) {
    console.error('❌ Scheduled training failed:', error)
  }
})

// 起動時にも一度チェック
async function checkPendingJobs() {
  console.log('🔍 Checking for pending training jobs')
  
  const { data: pendingJobs } = await supabase
    .from('training_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  
  if (pendingJobs && pendingJobs.length > 0) {
    console.log(`Found ${pendingJobs.length} pending jobs`)
    
    for (const job of pendingJobs) {
      console.log(`Processing job ${job.id} for task ${job.task}`)
      
      try {
        const config = {
          task: job.task,
          modelName: job.task,
          version: `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
          hyperparameters: job.config.hyperparameters
        }
        
        await runTrainingJob(job.id, config)
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error)
      }
    }
  } else {
    console.log('No pending jobs found')
  }
}

// 起動時チェック
checkPendingJobs()

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n👋 Stopping scheduler')
  process.exit(0)
})

console.log('✅ Scheduler is running. Press Ctrl+C to stop.')