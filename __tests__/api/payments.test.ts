import { POST as WebhookPOST } from '../../app/api/v1/payments/webhook/route'
import { POST as CheckoutPOST } from '../../app/api/v1/payments/checkout/route'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

// Stripeモック
jest.mock('stripe')

describe('/api/v1/payments', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
    process.env.PAYMENT_PROVIDER = 'stripe'
    jest.clearAllMocks()
  })

  describe('POST /webhook', () => {
    it('有効なwebhookを処理', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue({
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                customer: 'cus_test_123',
                subscription: 'sub_test_123',
                metadata: {
                  user_id: 'test-user-id',
                  plan_code: 'standard'
                }
              }
            }
          })
        }
      };

      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      const mockSupabase = {
        from: jest.fn(() => ({
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'sub_test_123' },
                error: null
              })
            }))
          }))
        }))
      };

      jest.doMock('../../app/api/_lib/auth', () => ({
        getSupabaseServiceRole: jest.fn().mockReturnValue(mockSupabase)
      }));

      const request = new NextRequest('http://localhost:3000/api/v1/payments/webhook', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'stripe-signature': 'test-signature'
        }
      });

      const response = await WebhookPOST(request);
      expect(response.status).toBe(200);
    });

    it('無効な署名でエラー', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error('Invalid signature')
          })
        }
      };

      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      const request = new NextRequest('http://localhost:3000/api/v1/payments/webhook', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'stripe-signature': 'invalid-signature'
        }
      });

      const response = await WebhookPOST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /checkout', () => {
    it('決済セッションを作成', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/pay/cs_test_123'
            })
          }
        }
      };

      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'test-user-id' },
                error: null
              })
            }))
          }))
        }))
      };

      jest.doMock('../../app/api/_lib/auth', () => ({
        getSupabaseServiceRole: jest.fn().mockReturnValue(mockSupabase),
        getCurrentUser: jest.fn().mockResolvedValue({ id: 'test-user-id' })
      }));

      const request = new NextRequest('http://localhost:3000/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan_code: 'standard',
          success_url: 'http://localhost:3000/success',
          cancel_url: 'http://localhost:3000/cancel'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });

      const response = await CheckoutPOST(request);
      expect(response.status).toBe(200);
    });
  });
});