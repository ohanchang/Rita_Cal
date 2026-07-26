import { AppSettings, DEFAULT_SETTINGS, ACTIVITY_LEVELS, FITNESS_GOALS } from './types';

const STORAGE_KEY = 'food-calories-settings';

/** 取得設定 */
export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 儲存設定 */
export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === 'undefined') return;

  const current = getSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

// ==========================================
// BMR / TDEE 計算
// ==========================================

/**
 * 計算 BMR（基礎代謝率）— Mifflin-St Jeor 公式
 * 男: 10 × 體重(kg) + 6.25 × 身高(cm) - 5 × 年齡 + 5
 * 女: 10 × 體重(kg) + 6.25 × 身高(cm) - 5 × 年齡 - 161
 */
export function calculateBMR(settings: AppSettings): number {
  if (settings.inbodyBmrOverride) {
    return settings.inbodyBmrOverride;
  }
  const { gender, weight, height, age } = settings;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === '男' ? base + 5 : base - 161);
}

/**
 * 計算 TDEE（每日總消耗熱量）= BMR × 活動乘數
 */
export function calculateTDEE(settings: AppSettings): number {
  const bmr = calculateBMR(settings);
  const activity = ACTIVITY_LEVELS.find(a => a.level === settings.activityLevel);
  const multiplier = activity?.multiplier || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * 取得建議每日卡路里目標（根據 TDEE + 健身目標調整）
 */
export function getRecommendedCalories(settings: AppSettings): number {
  const tdee = calculateTDEE(settings);
  const goal = FITNESS_GOALS.find(g => g.goal === settings.fitnessGoal);
  const adjustment = goal?.adjustment || 0;
  return Math.max(1200, tdee + adjustment); // 最低不低於 1200 kcal
}

/**
 * 取得有效的每日卡路里目標
 * 如果 useAutoCalorie=true，使用自動計算值；否則使用手動設定值
 */
export function getEffectiveCalorieTarget(settings: AppSettings): number {
  if (settings.useAutoCalorie) {
    return getRecommendedCalories(settings);
  }
  return settings.dailyCalorieTarget;
}

/** 計算每日目標攝取的各營養素克數 */
export function getDailyTargets(settings: AppSettings) {
  const calories = getEffectiveCalorieTarget(settings);
  const { proteinRatio, carbsRatio, fatRatio } = settings;

  return {
    calories,
    protein: Math.round((calories * proteinRatio / 100) / 4),   // 1g protein = 4 kcal
    carbs: Math.round((calories * carbsRatio / 100) / 4),       // 1g carb = 4 kcal
    fat: Math.round((calories * fatRatio / 100) / 9),           // 1g fat = 9 kcal
  };
}
