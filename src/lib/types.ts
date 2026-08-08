// ==========================================
// 食物辨識相關型別與版本號
// ==========================================

export const APP_VERSION = "v1.6";

/** 單一食物品項 */
export interface FoodItem {
  /** 食物名稱 */
  name: string;
  /** 估算卡路里 (kcal) */
  calories: number;
  /** 蛋白質 (g) */
  protein: number;
  /** 碳水化合物 (g) */
  carbs: number;
  /** 脂肪 (g) */
  fat: number;
  /** 膳食纖維 (g) */
  fiber: number;
  /** 估算份量描述 */
  portion: string;
  /** AI 信心指數 */
  confidence: Confidence;
}

/** Gemini AI 辨識食物後回傳的資料結構 */
export interface FoodData {
  /** 主要食物名稱 (概括) */
  foodName: string;
  /** 品項明細列表 */
  items: FoodItem[];
  /** 總卡路里 (kcal) */
  totalCalories: number;
  /** 總蛋白質 (g) */
  totalProtein: number;
  /** 總碳水化合物 (g) */
  totalCarbs: number;
  /** 總脂肪 (g) */
  totalFat: number;
  /** 總膳食纖維 (g) */
  totalFiber: number;
  /** 用餐類型 */
  mealType: MealType;
  /** 來源 */
  source: FoodSource;
  /** 餐廳名稱 (選填) */
  restaurantName: string;
  /** 日期 */
  date: string;
  /** 備註 */
  note: string;
  /** 整體的計算信心度 */
  overallConfidence: Confidence;
}

/** 從 Notion 讀取的完整食物記錄 */
export interface FoodRecord extends FoodData {
  /** Notion page ID */
  id: string;
  /** 建立時間 */
  createdAt: string;
}

// ==========================================
// 分類
// ==========================================

/** AI 信心指數 */
export type Confidence = '高' | '中' | '低';

/** 用餐類型 */
export type MealType = '早餐' | '午餐' | '晚餐' | '點心' | '宵夜';

/** 食物來源 */
export type FoodSource =
  | '路邊攤'
  | '便當'
  | '公司便當'
  | '自煮'
  | '超商'
  | '餐廳'
  | '其他';

/** 所有用餐類型 */
export const MEAL_TYPES: MealType[] = [
  '早餐', '午餐', '晚餐', '點心', '宵夜'
];

/** 所有食物來源 */
export const FOOD_SOURCES: FoodSource[] = [
  '路邊攤', '便當', '公司便當', '自煮', '超商', '餐廳', '其他'
];

/** 所有信心指數 */
export const CONFIDENCE_LEVELS: Confidence[] = ['高', '中', '低'];

// ==========================================
// 身體資料與目標
// ==========================================

/** 性別 */
export type Gender = '男' | '女';

/** 活動量等級 */
export type ActivityLevel = '久坐' | '輕度活動' | '中度活動' | '重度活動' | '極重度活動';

/** 健身目標 */
export type FitnessGoal = '減脂' | '維持' | '增肌';

/** 活動量等級與 TDEE 乘數 */
export const ACTIVITY_LEVELS: { level: ActivityLevel; multiplier: number; description: string }[] = [
  { level: '久坐', multiplier: 1.2, description: '辦公室工作，幾乎不運動' },
  { level: '輕度活動', multiplier: 1.375, description: '每週運動 1-3 天' },
  { level: '中度活動', multiplier: 1.55, description: '每週運動 3-5 天' },
  { level: '重度活動', multiplier: 1.725, description: '每週運動 6-7 天' },
  { level: '極重度活動', multiplier: 1.9, description: '高強度訓練或體力勞動' },
];

/** 健身目標與卡路里調整 */
export const FITNESS_GOALS: { goal: FitnessGoal; adjustment: number; description: string }[] = [
  { goal: '減脂', adjustment: -400, description: 'TDEE - 400 kcal' },
  { goal: '維持', adjustment: 0, description: '= TDEE' },
  { goal: '增肌', adjustment: 250, description: 'TDEE + 250 kcal' },
];

// ==========================================
// 比例尺
// ==========================================

/** 比例尺選項 */
export interface ScaleReference {
  id: string;
  name: string;
  description: string;
  /** 實際尺寸描述 (給 AI 的提示) */
  sizeHint: string;
}

/** 預設比例尺選項 */
export const SCALE_REFERENCES: ScaleReference[] = [
  { id: 'none', name: '無比例尺', description: '不使用比例尺', sizeHint: '' },
  { id: 'tw10', name: '台幣 10 元', description: '直徑 26mm 的硬幣', sizeHint: '照片中有一枚台幣10元硬幣（直徑26mm）作為尺寸參考' },
  { id: 'card', name: '信用卡', description: '85.6 × 53.98 mm', sizeHint: '照片中有一張標準信用卡（85.6mm × 53.98mm）作為尺寸參考' },
  { id: 'chopsticks', name: '筷子', description: '標準 22.5cm', sizeHint: '照片中有一雙標準筷子（長度約22.5cm）作為尺寸參考' },
  { id: 'phone', name: '手機', description: '約 15cm', sizeHint: '照片中有一支智慧型手機（長度約15cm）作為尺寸參考' },
];

// ==========================================
// 設定
// ==========================================

/** 外觀主題 */
export type Theme = 'light' | 'dark' | 'system';

/** 應用程式設定 */
export interface AppSettings {
  /** 介面主題 */
  theme: Theme;
  /** 性別 */
  gender: Gender;
  /** 年齡 */
  age: number;
  /** 身高 (cm) */
  height: number;
  /** 體重 (kg) */
  weight: number;
  /** 活動量 */
  activityLevel: ActivityLevel;
  /** 健身目標 */
  fitnessGoal: FitnessGoal;

  /** 若有 InBody 資料，允許使用者選擇覆寫預設基礎代謝計算 */
  inbodyBmrOverride?: number;

  /** 是否使用自動計算的卡路里目標 */
  useAutoCalorie: boolean;
  /** 手動設定的每日卡路里目標 (kcal)，useAutoCalorie=false 時使用 */
  dailyCalorieTarget: number;
  /** 蛋白質目標比例 (%) */
  proteinRatio: number;
  /** 碳水目標比例 (%) */
  carbsRatio: number;
  /** 脂肪目標比例 (%) */
  fatRatio: number;
}

/** 預設設定 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  gender: '男',
  age: 30,
  height: 170,
  weight: 70,
  activityLevel: '輕度活動',
  fitnessGoal: '維持',
  inbodyBmrOverride: undefined,
  useAutoCalorie: true,
  dailyCalorieTarget: 2000,
  proteinRatio: 30,
  carbsRatio: 45,
  fatRatio: 25,
};

// ==========================================
// API 回應
// ==========================================

/** Gemini API 分析結果回應 */
export interface AnalyzeResponse {
  success: boolean;
  data?: FoodData;
  error?: string;
}

/** 品牌搜尋回應 */
export interface SearchResponse {
  success: boolean;
  data?: FoodData;
  error?: string;
}

/** Notion API 回應 */
export interface NotionResponse {
  success: boolean;
  data?: FoodRecord[];
  error?: string;
}

// ==========================================
// 統計相關
// ==========================================

/** 每日攝取統計 */
export interface DailyIntake {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  count: number;
}

/** 用餐類型統計 */
export interface MealTypeStats {
  mealType: MealType;
  totalCalories: number;
  count: number;
  percentage: number;
}

// ==========================================
// InBody 身體組成
// ==========================================

/** 部位別單一肢段 */
export interface SegmentalPart {
  weight: number | null;  // kg
  percentage: number | null; // %
  rating: string;   // 正常/高/低
}

/** 部位別肌肉/脂肪資料 */
export interface SegmentalData {
  leftArm: SegmentalPart;
  rightArm: SegmentalPart;
  trunk: SegmentalPart;
  leftLeg: SegmentalPart;
  rightLeg: SegmentalPart;
}

/** InBody 測量數據 */
export interface InBodyData {
  /** 檢測日期 */
  date: string;
  /** InBody 綜合評分 */
  score: number | null;
  /** 體重 kg */
  weight: number | null;
  /** 體脂率 % */
  bodyFatPercent: number | null;
  /** BMI */
  bmi: number | null;
  /** 骨骼肌重 kg */
  skeletalMuscleMass: number | null;
  /** 體脂肪重 kg */
  bodyFatMass: number | null;
  /** 總水重 L */
  totalBodyWater: number | null;
  /** 蛋白質重 kg */
  protein: number | null;
  /** 礦物質重 kg */
  minerals: number | null;
  /** 除脂體重 kg */
  leanBodyMass: number | null;
  /** 基礎代謝率 kcal */
  bmr: number | null;
  /** 腰臀圍比 WHR */
  whr: number | null;
  /** 內臟脂肪級別 */
  visceralFatLevel: number | null;
  /** 肥胖度 % */
  obesityDegree: number | null;
  /** SMI kg/m² */
  smi: number | null;
  /** 建議熱量攝取 kcal */
  recommendedCalorie: number | null;
  /** 目標體重 kg */
  targetWeight: number | null;
  /** 脂肪控制 kg (負值=需減) */
  fatControl: number | null;
  /** 肌肉控制 kg */
  muscleControl: number | null;
  /** 部位別肌肉 */
  segmentalMuscle: SegmentalData | null;
  /** 部位別脂肪 */
  segmentalFat: SegmentalData | null;
  /** AI 解析警告 */
  warnings: string[];
}

/** Notion 中的 InBody 紀錄 */
export interface InBodyRecord extends InBodyData {
  id: string;
  createdAt: string;
}

// ==========================================
// 藥物紀錄 (Mounjaro)
// ==========================================

/** 猛健樂 (Mounjaro/Tirzepatide) 施打紀錄 */
export interface MounjaroRecord {
  id: string;
  /** 施打日期 YYYY-MM-DD */
  date: string;
  /** 劑量 (mg) */
  dose: number;
  createdAt: string;
}

/** AI 飲食分析與建議 */
export interface DietAnalysis {
  /** 分析區間 */
  period: '7days' | '30days';
  /** 飲食總結 */
  summary: string;
  /** 熱量攝取評估 */
  calorieAssessment: string;
  macroAssessment: string;
  /** 針對 GLP-1 施打狀況的多維度評估與影響分析 */
  mounjaroAssessment?: string;
  /** 飲食優點 */
  strengths: string[];
  /** 需注意事項 */
  concerns: string[];
  /** 具體改善建議 */
  suggestions: string[];
  /** 產生時間 */
  generatedAt?: string;
}
