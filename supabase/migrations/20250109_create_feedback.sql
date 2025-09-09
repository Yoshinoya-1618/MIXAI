-- フィードバックテーブルの作成
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- bug, feature, improvement, other
  category VARCHAR(100), -- UI/UX, performance, audio_quality, feature_request, etc
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 5段階評価
  message TEXT NOT NULL,
  page_url TEXT, -- フィードバックが送信されたページのURL
  user_agent TEXT, -- ブラウザ情報
  user_id UUID REFERENCES auth.users(id), -- ログインユーザーの場合
  user_email VARCHAR(255), -- 匿名ユーザーの連絡先（オプション）
  user_name VARCHAR(255), -- 匿名ユーザーの名前（オプション）
  status VARCHAR(50) DEFAULT 'new', -- new, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  admin_notes TEXT, -- 管理者のメモ
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの追加
CREATE INDEX idx_feedback_type ON public.feedback(type);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_priority ON public.feedback(priority);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);

-- RLSの有効化
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 誰でもフィードバックを送信できる
CREATE POLICY "Anyone can create feedback" ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- ユーザーは自分のフィードバックを閲覧できる
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- 管理者は全てのフィードバックを管理できる
CREATE POLICY "Admins can manage all feedback" ON public.feedback
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data ->> 'role' = 'admin'
    )
  );

-- updated_atを自動更新するトリガー（既存の関数を再利用）
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- フィードバック返信テーブル（オプション）
CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID REFERENCES public.feedback(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false, -- ユーザーに表示するかどうか
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの追加
CREATE INDEX idx_feedback_responses_feedback_id ON public.feedback_responses(feedback_id);

-- RLSの有効化
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- フィードバック送信者と管理者は返信を閲覧できる
CREATE POLICY "Users can view responses to their feedback" ON public.feedback_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback
      WHERE feedback.id = feedback_responses.feedback_id
        AND (feedback.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

-- 管理者のみ返信を作成できる
CREATE POLICY "Only admins can create responses" ON public.feedback_responses
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data ->> 'role' = 'admin'
    )
  );