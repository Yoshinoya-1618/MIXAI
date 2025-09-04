// MIXセッション管理
export interface MixSession {
  jobId: string;
  plan: 'lite' | 'standard' | 'creator';
  stage: 'upload' | 'analysis' | 'adjustment' | 'preview' | 'export' | 'completed' | 'interrupted';
  parameters?: Record<string, any>;
  harmonySettings?: {
    type: 'up_m3' | 'down_m3' | 'perfect_5th' | 'up_down_m3' | null;
    level: number;
    applied: boolean;
  };
  lastActivity: number;
  expiresAt: number;
  metadata?: {
    title?: string;
    artist?: string;
    duration?: number;
    format?: string;
  };
}

// セッション状態をローカルストレージに保存
export function saveMixSession(session: MixSession): void {
  try {
    localStorage.setItem(`mixai:session:${session.jobId}`, JSON.stringify({
      ...session,
      lastActivity: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save mix session:', error);
  }
}

// セッション状態をローカルストレージから復元
export function loadMixSession(jobId: string): MixSession | null {
  try {
    const data = localStorage.getItem(`mixai:session:${jobId}`);
    if (!data) return null;
    
    const session: MixSession = JSON.parse(data);
    
    // セッション期限チェック
    if (Date.now() > session.expiresAt) {
      removeMixSession(jobId);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to load mix session:', error);
    return null;
  }
}

// 全てのアクティブなセッションを取得
export function getActiveSessions(): MixSession[] {
  try {
    const sessions: MixSession[] = [];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith('mixai:session:')) {
        const jobId = key.replace('mixai:session:', '');
        const session = loadMixSession(jobId);
        if (session) {
          sessions.push(session);
        }
      }
    }
    
    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  } catch (error) {
    console.error('Failed to get active sessions:', error);
    return [];
  }
}

// セッションを削除
export function removeMixSession(jobId: string): void {
  try {
    localStorage.removeItem(`mixai:session:${jobId}`);
  } catch (error) {
    console.error('Failed to remove mix session:', error);
  }
}

// セッションの段階を更新
export function updateSessionStage(
  jobId: string, 
  stage: MixSession['stage'], 
  parameters?: Record<string, any>
): void {
  const session = loadMixSession(jobId);
  if (!session) return;
  
  saveMixSession({
    ...session,
    stage,
    parameters: parameters || session.parameters,
  });
}

// ハモリ設定を更新
export function updateHarmonySettings(
  jobId: string,
  harmonySettings: MixSession['harmonySettings']
): void {
  const session = loadMixSession(jobId);
  if (!session) return;
  
  saveMixSession({
    ...session,
    harmonySettings,
  });
}

// セッション中断を処理
export function handleSessionInterruption(jobId: string): void {
  updateSessionStage(jobId, 'interrupted');
}

// セッション復旧URLを生成
export function getResumeUrl(session: MixSession): string {
  const baseUrl = `/mix/${session.plan}/${session.jobId}`;
  
  switch (session.stage) {
    case 'analysis':
      return `${baseUrl}?resume=analysis`;
    case 'adjustment':
      return `${baseUrl}?resume=adjustment`;
    case 'preview':
      return `${baseUrl}?resume=preview`;
    case 'export':
      return `${baseUrl}?resume=export`;
    case 'interrupted':
      return `${baseUrl}?resume=interrupted`;
    default:
      return baseUrl;
  }
}

// 期限切れセッションをクリーンアップ
export function cleanupExpiredSessions(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    for (const key of keys) {
      if (key.startsWith('mixai:session:')) {
        const data = localStorage.getItem(key);
        if (data) {
          const session: MixSession = JSON.parse(data);
          if (now > session.expiresAt) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
}

// ページ離脱時の警告
export function setupBeforeUnloadWarning(hasUnsavedChanges: boolean): void {
  if (typeof window === 'undefined') return;
  
  const handler = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'MIX調整が保存されていません。ページを離れますか？';
    }
  };
  
  window.addEventListener('beforeunload', handler);
  
  return () => {
    window.removeEventListener('beforeunload', handler);
  };
}