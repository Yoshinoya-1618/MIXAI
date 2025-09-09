-- お知らせテーブルの作成
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general', -- general, update, maintenance, important
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- 優先度（高い数値が優先）
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- 有効期限（NULLの場合は無期限）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- インデックスの追加
CREATE INDEX idx_announcements_active ON public.announcements(is_active);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at DESC);
CREATE INDEX idx_announcements_priority ON public.announcements(priority DESC);
CREATE INDEX idx_announcements_category ON public.announcements(category);

-- RLSの有効化
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 読み取り用ポリシー（全ユーザーがアクティブなお知らせを読める）
CREATE POLICY "Anyone can view active announcements" ON public.announcements
  FOR SELECT
  USING (
    is_active = true 
    AND published_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- 管理者用ポリシー（管理者は全操作可能）
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data ->> 'role' = 'admin'
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータの挿入（必要に応じて削除してください）
INSERT INTO public.announcements (title, content, category, priority) VALUES
  ('MIXAIへようこそ！', 'MIXAIをご利用いただきありがとうございます。最新のAI技術で音楽制作をサポートします。', 'general', 0),
  ('新機能リリース', 'ハーモニー解析機能が追加されました。より精密な音楽分析が可能になりました。', 'update', 1),
  ('メンテナンスのお知らせ', '明日午前2時から4時まで、システムメンテナンスを実施します。', 'maintenance', 2);