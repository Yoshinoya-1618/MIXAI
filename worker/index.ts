import { runLoop, runOnce } from './poller'

async function main() {
  const mode = process.env.WORKER_MODE || 'loop'
  if (mode === 'once') {
    const ok = await runOnce()
    // eslint-disable-next-line no-console
    console.log(ok ? 'processed one job' : 'no job')
  } else {
    // eslint-disable-next-line no-console
    console.log('worker: starting loop')
    await runLoop()
  }
}

// 実行時のみ起動（tsxで起動想定）
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
