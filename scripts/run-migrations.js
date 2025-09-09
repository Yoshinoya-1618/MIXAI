/**
 * データベースマイグレーション実行スクリプト
 * 使用方法: node scripts/run-migrations.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('📦 マイグレーション開始...\n')

  const migrationDir = path.join(__dirname, '..', 'supabase', 'migrations')
  
  // マイグレーションファイルの取得
  const files = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`見つかったマイグレーションファイル: ${files.length}個\n`)

  for (const file of files) {
    console.log(`📝 実行中: ${file}`)
    
    const filePath = path.join(migrationDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    
    try {
      // SQLを実行
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
      
      if (error) {
        // RPCが存在しない場合は、直接実行を試みる
        console.log('  ⚠️  RPCが利用できません。Supabaseダッシュボードから手動で実行してください。')
        console.log(`  📋 ファイルパス: ${filePath}`)
      } else {
        console.log('  ✅ 成功')
      }
    } catch (err) {
      console.error(`  ❌ エラー: ${err.message}`)
      console.log(`  📋 手動実行が必要です: ${filePath}`)
    }
    
    console.log()
  }

  console.log('✨ マイグレーション処理完了')
  console.log('\n⚠️  注意: 一部のマイグレーションはSupabaseダッシュボードから手動で実行する必要があります。')
  console.log('📍 SQL Editor: https://supabase.com/dashboard/project/_/sql')
}

// 実行
runMigrations().catch(console.error)