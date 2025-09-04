import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/jobs/route';

// テスト用のモックデータ
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const mockJob = {
  id: 'test-job-id',
  user_id: 'test-user-id',
  status: 'uploaded',
  instrumental_path: null,
  vocal_path: null,
  result_path: null,
  offset_ms: null,
  atempo: 1.0,
  target_lufs: -14.0,
  true_peak: null,
  error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('/api/v1/jobs POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常にジョブを作成できる', async () => {
    // Supabaseクライアントのモック設定
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockJob,
              error: null
            })
          }))
        }))
      }))
    };

    // モック関数を設定
    jest.doMock('@/app/api/_lib/auth', () => ({
      getSupabaseWithRLS: jest.fn().mockReturnValue(mockSupabase)
    }));

    jest.doMock('@/app/api/_lib/ratelimit', () => ({
      checkRateLimit: jest.fn().mockReturnValue(null),
      addRateLimitHeaders: jest.fn().mockImplementation((response) => response)
    }));

    const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    
    expect(response.status).toBe(201);
    
    const responseData = await response.json();
    expect(responseData.job).toEqual(mockJob);
    expect(responseData.upload_targets).toHaveProperty('instrumental_prefix');
    expect(responseData.upload_targets).toHaveProperty('vocal_prefix');
  });

  it('認証エラーの場合401を返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' }
        })
      }
    };

    jest.doMock('@/app/api/_lib/auth', () => ({
      getSupabaseWithRLS: jest.fn().mockReturnValue(mockSupabase)
    }));

    jest.doMock('@/app/api/_lib/ratelimit', () => ({
      checkRateLimit: jest.fn().mockReturnValue(null),
      addRateLimitHeaders: jest.fn().mockImplementation((response) => response)
    }));

    const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST'
    });

    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });

  it('レート制限に引っかかる場合429を返す', async () => {
    const rateLimitResponse = new Response('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    });

    jest.doMock('@/app/api/_lib/ratelimit', () => ({
      checkRateLimit: jest.fn().mockReturnValue(rateLimitResponse),
      addRateLimitHeaders: jest.fn()
    }));

    const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST'
    });

    const response = await POST(request);
    
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });
});