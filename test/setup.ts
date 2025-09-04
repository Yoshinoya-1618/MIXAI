// Jest テストセットアップファイル
import { jest } from '@jest/globals'

// Mock FFmpeg for tests
jest.mock('ffmpeg-static', () => '/usr/local/bin/ffmpeg')

// Mock execa for audio processing tests  
jest.mock('execa', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0
  })
}))

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'test-job-id', status: 'uploaded' },
        error: null
      })
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'test/path' }, 
          error: null 
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://test.com/signed-url' },
          error: null
        })
      })
    }
  })
}))

// Mock file system operations
import fs from 'fs/promises'
jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockResolvedValue([]),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined)
}))

// Global test utilities
global.createMockRequest = (options: any = {}) => {
  return {
    url: options.url || 'http://localhost:3000/api/test',
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    json: jest.fn().mockResolvedValue(options.body || {}),
    ...options
  } as any
}

global.createMockJob = (overrides: any = {}) => ({
  id: 'test-job-id',
  user_id: 'test-user-id', 
  status: 'uploaded',
  instrumental_path: null,
  vocal_path: null,
  result_path: null,
  offset_ms: null,
  atempo: null,
  target_lufs: -14,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

// Console suppression for tests
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  // Suppress console output in tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn()
    console.warn = jest.fn()  
    console.error = jest.fn()
  }
})

afterEach(() => {
  // Restore console
  if (!process.env.VERBOSE_TESTS) {
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  }
  
  // Clear all mocks
  jest.clearAllMocks()
})