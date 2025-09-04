#!/usr/bin/env node

/**
 * Health Check Script for Docker Container
 * 
 * このスクリプトはコンテナの健康状態をチェックします：
 * 1. プロセスの生存確認
 * 2. /api/health エンドポイントの応答確認
 * 3. 必要なリソースのアクセス確認
 */

const http = require('http');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const HEALTH_CHECK_URL = 'http://localhost:3000/api/health';
const TIMEOUT_MS = 5000;
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

async function checkEnvironment() {
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('✅ Environment variables OK');
  return true;
}

async function checkTempDirectory() {
  try {
    await fs.access('./temp');
    console.log('✅ Temp directory accessible');
    return true;
  } catch (error) {
    // Create temp directory if it doesn't exist
    try {
      await fs.mkdir('./temp', { recursive: true });
      console.log('✅ Temp directory created');
      return true;
    } catch (createError) {
      console.error(`❌ Cannot create temp directory: ${createError.message}`);
      return false;
    }
  }
}

async function checkHealthEndpoint() {
  return new Promise((resolve) => {
    const request = http.get(HEALTH_CHECK_URL, { timeout: TIMEOUT_MS }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          try {
            const healthData = JSON.parse(data);
            if (healthData.status === 'ok') {
              console.log('✅ Health endpoint OK');
              if (healthData.uptime) {
                console.log(`   Uptime: ${healthData.uptime}s`);
              }
              if (healthData.memory) {
                console.log(`   Memory: ${Math.round(healthData.memory.used / 1024 / 1024)}MB used`);
              }
              resolve(true);
            } else {
              console.error(`❌ Health endpoint returned unhealthy status: ${healthData.status}`);
              resolve(false);
            }
          } catch (parseError) {
            console.error(`❌ Invalid health endpoint response: ${parseError.message}`);
            resolve(false);
          }
        } else {
          console.error(`❌ Health endpoint returned status ${response.statusCode}`);
          resolve(false);
        }
      });
    });
    
    request.on('timeout', () => {
      console.error(`❌ Health endpoint timeout (${TIMEOUT_MS}ms)`);
      request.destroy();
      resolve(false);
    });
    
    request.on('error', (error) => {
      console.error(`❌ Health endpoint error: ${error.message}`);
      resolve(false);
    });
  });
}

async function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    let output = '';
    
    ffmpeg.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && output.includes('ffmpeg version')) {
        console.log('✅ FFmpeg available');
        resolve(true);
      } else {
        console.error('❌ FFmpeg not available or failed');
        resolve(false);
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error(`❌ FFmpeg check error: ${error.message}`);
      resolve(false);
    });
    
    // Timeout for FFmpeg check
    setTimeout(() => {
      ffmpeg.kill();
      console.error('❌ FFmpeg check timeout');
      resolve(false);
    }, 5000);
  });
}

async function main() {
  console.log('🔍 Starting health check...');
  
  const checks = await Promise.all([
    checkEnvironment(),
    checkTempDirectory(),
    checkHealthEndpoint(),
    checkFFmpeg()
  ]);
  
  const allPassed = checks.every(result => result === true);
  
  if (allPassed) {
    console.log('✅ All health checks passed');
    process.exit(0);
  } else {
    console.error('❌ Some health checks failed');
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Health check interrupted by SIGTERM');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Health check interrupted by SIGINT');
  process.exit(1);
});

main().catch((error) => {
  console.error(`❌ Health check failed with error: ${error.message}`);
  process.exit(1);
});