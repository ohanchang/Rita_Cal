const DEMO_KEY = 'food-calories-demo';

/** 是否為 Demo 模式 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;

  // 如果沒有設定過 Notion token，自動進入 Demo 模式
  const notionConfigured = localStorage.getItem('food-calories-notion-configured');
  if (!notionConfigured) return true;

  return localStorage.getItem(DEMO_KEY) === 'true';
}

/** 設定 Demo 模式 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_KEY, String(enabled));
}

/** 標記 Notion 已設定 */
export function setNotionConfigured(configured: boolean): void {
  if (typeof window === 'undefined') return;
  if (configured) {
    localStorage.setItem('food-calories-notion-configured', 'true');
  } else {
    localStorage.removeItem('food-calories-notion-configured');
  }
}
