-- instファイルのトリミング対応のためのカラム追加
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS instrumental_path_trimmed TEXT,
ADD COLUMN IF NOT EXISTS trimmed_at TIMESTAMP WITH TIME ZONE;

-- トリミング済みファイルパスのコメント
COMMENT ON COLUMN jobs.instrumental_path_trimmed IS 'ボーカルの長さに合わせてトリミングされたinstファイルのパス';
COMMENT ON COLUMN jobs.trimmed_at IS 'instファイルがトリミングされた日時';