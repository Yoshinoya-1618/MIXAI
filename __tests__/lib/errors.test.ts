import { 
  badRequest, 
  unauthorized, 
  notFound, 
  tooManyRequests, 
  internalError,
  handleApiError 
} from '@/app/api/_lib/errors';

describe('エラーレスポンス関数', () => {
  describe('badRequest', () => {
    it('400エラーレスポンスを返す', () => {
      const response = badRequest('不正なリクエスト');
      expect(response.status).toBe(400);
    });

    it('詳細情報を含む400エラーレスポンスを返す', async () => {
      const details = { field: 'email', error: 'invalid format' };
      const response = badRequest('バリデーションエラー', details);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.details).toEqual(details);
    });
  });

  describe('unauthorized', () => {
    it('401エラーレスポンスを返す', () => {
      const response = unauthorized('認証が必要です');
      expect(response.status).toBe(401);
    });
  });

  describe('notFound', () => {
    it('404エラーレスポンスを返す', () => {
      const response = notFound('リソースが見つかりません');
      expect(response.status).toBe(404);
    });
  });

  describe('tooManyRequests', () => {
    it('429エラーレスポンスを返す', () => {
      const response = tooManyRequests('レート制限に達しました');
      expect(response.status).toBe(429);
    });
  });

  describe('internalError', () => {
    it('500エラーレスポンスを返す', () => {
      const response = internalError('内部サーバーエラー');
      expect(response.status).toBe(500);
    });
  });

  describe('handleApiError', () => {
    it('Errorオブジェクトの場合、メッセージを含む500エラーを返す', async () => {
      const error = new Error('テストエラー');
      const response = handleApiError(error, 'テスト処理');
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('テスト処理でエラーが発生しました: テストエラー');
    });

    it('不明なエラーの場合、汎用的な500エラーを返す', async () => {
      const error = 'string error';
      const response = handleApiError(error, 'テスト処理');
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('テスト処理で予期しないエラーが発生しました');
    });

    it('コンテキストが指定されていない場合のデフォルト動作', async () => {
      const error = new Error('テストエラー');
      const response = handleApiError(error);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('API処理中でエラーが発生しました: テストエラー');
    });
  });
});