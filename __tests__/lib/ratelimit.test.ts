import { checkRateLimit, addRateLimitHeaders, resetRateLimitStore } from '@/app/api/_lib/ratelimit';
import { NextRequest } from 'next/server';

describe('レート制限機能', () => {
  beforeEach(() => {
    // レート制限ストアを完全にリセット
    resetRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('初回リクエストは通す', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const result = checkRateLimit(request);
      expect(result).toBeNull();
    });

    it('制限回数を超えた場合は429エラーを返す', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.200' }
      });

      // 制限回数（10回）まで実行
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(request);
        expect(result).toBeNull();
      }

      // 11回目は制限される
      const result = checkRateLimit(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10');
    });

    it('異なるIPアドレスは独立してカウントされる', () => {
      const request1 = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.0.0.1' }
      });

      const request2 = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.0.0.2' }
      });

      // IP1で10回実行（制限いっぱい）
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(request1);
        expect(result).toBeNull();
      }

      // IP1では制限される
      const result1 = checkRateLimit(request1);
      expect(result1).not.toBeNull();

      // IP2では制限されない（独立したカウンタ）
      const result2 = checkRateLimit(request2);
      expect(result2).toBeNull();
    });

    it('認証ヘッダーがある場合はトークンも考慮する', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 
          'x-forwarded-for': '172.16.0.1',
          'authorization': 'Bearer test-token-123'
        }
      });

      const result = checkRateLimit(request);
      expect(result).toBeNull();
    });
  });

  describe('addRateLimitHeaders', () => {
    it('レート制限ヘッダーを追加する', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/jobs', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.1' }
      });

      // 1回リクエストを実行してデータを作成
      checkRateLimit(request);

      const originalResponse = new Response('test');
      const response = addRateLimitHeaders(originalResponse, request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
    });
  });
});