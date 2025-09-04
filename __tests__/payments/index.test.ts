import { createPayment, verifyStripeWebhook } from '@/payments/index';

// Stripeのモック
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

describe('決済機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('正常に決済を作成する', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_456',
        amount: 30000,
        currency: 'jpy',
        status: 'requires_payment_method'
      };

      const mockStripe = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent)
        }
      };

      // Stripeインスタンスをモック
      jest.doMock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

      const input = {
        jobId: 'test-job-id',
        amount: 300,
        currency: 'JPY',
        customerEmail: 'test@example.com',
        idempotencyKey: 'test-idempotency-key'
      };

      const result = await createPayment(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.paymentIntent.id).toBe('pi_test_123');
        expect(result.paymentIntent.client_secret).toBe('pi_test_123_secret_456');
      }
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 30000,
          currency: 'jpy',
          metadata: { job_id: 'test-job-id', source: 'uta-seion' }
        }),
        { idempotencyKey: 'test-idempotency-key' }
      );
    });

    it('Stripeエラーの場合は適切にハンドリングする', async () => {
      const mockError = new Error('Card declined');
      
      const mockStripe = {
        paymentIntents: {
          create: jest.fn().mockRejectedValue(mockError)
        }
      };

      jest.doMock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

      const input = {
        jobId: 'test-job-id',
        amount: 300,
        currency: 'JPY',
        customerEmail: 'test@example.com',
        idempotencyKey: 'test-idempotency-key'
      };

      const result = await createPayment(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Card declined');
      }
    });
  });

  describe('verifyStripeWebhook', () => {
    it('正常な署名の場合はイベントを返す', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      };

      const mockStripe = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(mockEvent)
        }
      };

      jest.doMock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

      // テスト用の環境変数設定
      process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
      process.env.STRIPE_SECRET_KEY = 'test-secret-key';

      const result = verifyStripeWebhook('test-payload', 'test-signature');

      expect(result).toEqual(mockEvent);
    });

    it('不正な署名の場合はnullを返す', () => {
      const mockError = new Error('Invalid signature');

      const mockStripe = {
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw mockError;
          })
        }
      };

      jest.doMock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

      const result = verifyStripeWebhook('test-payload', 'invalid-signature');

      expect(result).toBeNull();
    });
  });
});