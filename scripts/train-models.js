#!/usr/bin/env node
// scripts/train-models.js
// MLモデルの学習スクリプト

import { createClient } from '@supabase/supabase-js'
import { runTrainingJob } from '../worker/training.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const task = process.argv[2] || 'all'
  
  console.log(`🎓 Starting training for task: ${task}`)
  
  try {
    if (task === 'all') {
      // 全タスクの学習
      await trainAllTasks()
    } else {
      // 特定タスクの学習
      await trainTask(task)
    }
    
    console.log('✅ Training completed successfully')
  } catch (error) {
    console.error('❌ Training failed:', error)
    process.exit(1)
  }
}

async function trainAllTasks() {
  const tasks = ['master_reg', 'preset_cls', 'align_conf']
  
  for (const task of tasks) {
    await trainTask(task)
  }
}

async function trainTask(taskName) {
  console.log(`📊 Checking data availability for ${taskName}`)
  
  // データ数の確認
  const { count, error } = await supabase
    .from('labels')
    .select('*', { count: 'exact', head: true })
    .eq('task', taskName)
  
  if (error) {
    throw new Error(`Failed to count data: ${error.message}`)
  }
  
  if (count < 100) {
    console.log(`⚠️ Insufficient data for ${taskName}: ${count} samples (minimum: 100)`)
    return
  }
  
  console.log(`✓ Found ${count} samples for ${taskName}`)
  
  // 学習ジョブの作成
  const { data: job, error: jobError } = await supabase
    .from('training_jobs')
    .insert({
      task: taskName,
      status: 'pending',
      config: {
        hyperparameters: {
          learningRate: 0.001,
          maxIterations: 1000,
          regularization: 0.01,
          validationSplit: 0.2
        }
      }
    })
    .select()
    .single()
  
  if (jobError) {
    throw new Error(`Failed to create job: ${jobError.message}`)
  }
  
  console.log(`📝 Created training job ${job.id}`)
  
  // 学習の実行
  const config = {
    task: taskName,
    modelName: taskName,
    version: `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    hyperparameters: job.config.hyperparameters
  }
  
  const result = await runTrainingJob(job.id, config)
  
  console.log(`✓ Model trained: ${result.modelUri}`)
  console.log(`  Metrics:`, result.metrics)
}

// スクリプト実行
main().catch(console.error)