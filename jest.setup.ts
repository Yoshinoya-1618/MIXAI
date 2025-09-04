// Jest セットアップファイル
import { TextEncoder, TextDecoder } from 'util';

// グローバルなモック設定
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Supabase モック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        getSignedUrl: jest.fn(),
        remove: jest.fn()
      }))
    }
  }))
}));

// Next.js Request/Response モック
global.Request = class MockRequest {
  constructor(public url: string, public init: any = {}) {}
  headers = new Map();
  json = jest.fn();
};

global.Response = class MockResponse {
  constructor(public body: any, public init: any = {}) {}
  headers = new Map();
  json = jest.fn();
  static json = (data: any, init?: any) => new MockResponse(JSON.stringify(data), init);
};

// 環境変数のデフォルト設定
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.SIGNED_URL_TTL_SEC = '3600';
process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';