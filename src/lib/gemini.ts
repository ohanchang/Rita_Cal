import { GoogleGenerativeAI } from '@google/generative-ai';
import { FoodData, FoodRecord, InBodyData, DietAnalysis } from './types';
import { inBodyDataSchema, dietAnalysisSchema } from './schema';

// Model Fallback 策略
const MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-3-flash-preview',
];
/** 建立食物辨識 Prompt */
function buildFoodPrompt(scaleHint: string, hintText: string): string {
  return `你是一個專業的營養師與食物辨識專家。請仔細分析這張食物照片，辨識所有食物品項，並估算卡路里與營養素。

## 回傳格式
請嚴格以 JSON 格式回傳，不要包含 markdown 標記或其他文字：

{
  "foodName": "整體描述（如：雞腿便當、麥當勞大麥克套餐）",
  "items": [
    {
      "name": "食物品項名稱",
      "calories": 卡路里數字(kcal),
      "protein": 蛋白質克數(g),
      "carbs": 碳水化合物克數(g),
      "fat": 脂肪克數(g),
      "fiber": 膳食纖維克數(g),
      "portion": "份量描述（如：1碗約300g、1片約50g）",
      "confidence": "高/中/低"
    }
  ],
  "totalCalories": 總卡路里,
  "totalProtein": 總蛋白質,
  "totalCarbs": 總碳水化合物,
  "totalFat": 總脂肪,
  "totalFiber": 總膳食纖維,
  "mealType": "早餐/午餐/晚餐/點心/宵夜",
  "source": "路邊攤/便當/公司便當/自煮/超商/餐廳/其他",
  "restaurantName": "餐廳名稱（如能辨識）",
  "date": "",
  "note": "備註說明",
  "overallConfidence": "高/中/低"
}

${hintText ? `## 輔助提示文字\n使用者提供了這段文字輔助：「${hintText}」。\n請 **優先依靠照片判斷**，上面的文字只是輔助參考（可能包含餐廳或套餐名稱），幫助你更精確地估算卡路里與營養素。\n` : ''}
${scaleHint ? `## 比例尺資訊\n${scaleHint}\n請根據此比例尺估算食物的實際大小，從而更精確地估算份量與卡路里。\n` : ''}

## 辨識規則

### 食物辨識：
- 辨識照片中所有可見的食物品項
- 如果是套餐或便當，請分別列出每個品項
- 如果看到包裝上的品牌或營養標示，優先使用標示上的資訊
- 如果是常見連鎖餐廳的食物（如麥當勞、肯德基、星巴克等），使用該品牌的官方營養資訊

### 卡路里估算：
- 根據食物種類和估算份量計算卡路里
- 蛋白質 1g = 4 kcal, 碳水化合物 1g = 4 kcal, 脂肪 1g = 9 kcal
- 請驗算：totalCalories ≈ totalProtein×4 + totalCarbs×4 + totalFat×9
- 各品項的卡路里加總應等於 totalCalories

### 份量估算：
- 如果有比例尺，請根據比例尺推算食物的實際大小
- 如果沒有比例尺，根據常見餐飲的標準份量估算
- 如果是便當盒，常見尺寸約 20×15cm
- 如果是碗，常見飯碗容量約 200-300ml

### 用餐類型判定（mealType）：
只能填以下其中一個：
- 早餐（麵包、三明治、蛋餅、豆漿等早餐類食物）
- 午餐（便當、定食等正餐類食物）
- 晚餐（正餐類食物）
- 點心（甜點、蛋糕、餅乾、水果）
- 宵夜（消夜類小食）
- 如果無法明確判定，預設為「午餐」

### 來源判定（source）：
只能填以下其中一個：
- 路邊攤
- 便當（一般市售便當）
- 公司便當
- 自煮
- 超商（7-11、全家等）
- 餐廳（包含連鎖與一般餐廳）
- 其他

### 信心指數（confidence）：
- 高：食物清楚可辨、份量明確、有比例尺或包裝標示
- 中：食物可辨但在份量需估算
- 低：食物模糊、混合料理難以分辨、份量不確定

## 重要提醒
- 請仔細辨識每一種食物
- 卡路里估算要合理（一般正餐 400-800 kcal，點心 100-300 kcal）
- 如果不確定，在 note 中說明
- 回傳純 JSON，不要有任何其他文字`;
}

/** 建立餐前/餐後食物比對辨識 Prompt */
function buildBeforeAfterFoodPrompt(scaleHint: string, hintText: string): string {
  return `你是一個專業的營養師與食物辨識專家。使用者提供了餐前與餐後照片，請仔細比對這兩張照片，辨識所有食物品項，並估算卡路里與營養素。

## 任務細節
- 第一張圖片是【餐前照片】：展示食物剛送達或開始食用前的完整狀態。
- 第二張圖片是【餐後剩餘照片】：展示吃完後剩餘的狀態。
- 請你找出兩張照片中對應的食物，並估計每種食物【實際吃掉的百分比 (portion consumed)】。
- 實際攝取量 = 餐前估計份量 × 實際吃掉的百分比。
- 最終回傳的數值（calories, protein, carbs, fat, fiber 等）必須是【實際攝取量】的營養數值，不是整份的數值。

## 回傳格式
請嚴格以 JSON 格式回傳，不要包含 markdown 標記或其他文字：

{
  "foodName": "餐後實際吃掉的食物整體描述（如：起司漢堡套餐（吃剩約一半））",
  "items": [
    {
      "name": "食物品項名稱",
      "calories": 實際吃掉的卡路里數字(kcal),
      "protein": 實際吃掉的蛋白質克數(g),
      "carbs": 實際吃掉的碳水化合物克數(g),
      "fat": 實際吃掉的脂肪克數(g),
      "fiber": 實際吃掉的膳食纖維克數(g),
      "portion": "實際吃掉份量描述（如：原一個吃掉70%約140g、原一整份薯條吃掉約一半）",
      "confidence": "高/中/低"
    }
  ],
  "totalCalories": 實際吃掉的總卡路里,
  "totalProtein": 實際吃掉的總蛋白質,
  "totalCarbs": 實際吃掉的總碳水化合物,
  "totalFat": 實際吃掉的總脂肪,
  "totalFiber": 實際吃掉的總膳食纖維,
  "mealType": "早餐/午餐/晚餐/點心/宵夜",
  "source": "路邊攤/便當/公司便當/自煮/超商/餐廳/其他",
  "restaurantName": "餐廳名稱（如能辨識）",
  "date": "",
  "note": "備註說明。必須詳細說明餐前的熱量估算，餐後的剩餘狀態（百分比），以及扣除後實際攝取的卡路里計算過程，以便使用者理解。",
  "overallConfidence": "高/中/低"
}

${hintText ? `## 輔助提示文字\n使用者提供了這段文字輔助：「${hintText}」。\n請優先依靠照片判斷，上面的文字只是輔助參考。\n` : ''}
${scaleHint ? `## 比例尺資訊\n${scaleHint}\n請根據此比例尺估算食物的實際大小。\n` : ''}

## 辨識與比對規則

### 1. 雙圖對比計算：
- 仔細比對【第一張餐前圖】與【第二張餐後圖】。
- 例如：如果餐前盤子裡有三塊炸雞，餐後只剩下一塊，那表示實際吃掉了兩塊（吃掉約 67%）。
- 例如：如果是整碗麵，餐前是滿的，餐後湯和麵剩下一半，那表示吃掉約 50%。
- 請不要將「餐後剩餘的骨頭、殼、辣椒、裝飾葉子、醬汁」誤判為未食用的食物。

### 2. 營養素計算：
- 蛋白質 1g = 4 kcal, 碳水化合物 1g = 4 kcal, 脂肪 1g = 9 kcal。
- 請驗算：totalCalories ≈ totalProtein×4 + totalCarbs×4 + totalFat×9。
- 各品項的卡路里加總應等於 totalCalories。
- 確保 items 中的數值也是【實際吃掉的部分】的數值。

### 3. 用餐類型與來源判定：
- 用餐類型（mealType）只能填：早餐/午餐/晚餐/點心/宵夜。
- 來源判定（source）只能填：路邊攤/便當/公司便當/自煮/超商/餐廳/其他。

## 重要提醒
- 回傳純 JSON，不要有任何其他文字。`;
}

/** 建立品牌餐廳搜尋 Prompt */
function buildSearchPrompt(query: string): string {
  return `你是一個專業的營養師。使用者想查詢以下食物的營養資訊：

「${query}」

請根據你的知識，提供這個食物或套餐的營養資訊。如果是知名品牌（如麥當勞、星巴克、肯德基等），請使用該品牌的官方營養資訊。

## 回傳格式
請嚴格以 JSON 格式回傳，不要包含 markdown 標記或其他文字：

{
  "foodName": "食物完整名稱",
  "items": [
    {
      "name": "品項名稱",
      "calories": 卡路里(kcal),
      "protein": 蛋白質(g),
      "carbs": 碳水化合物(g),
      "fat": 脂肪(g),
      "fiber": 膳食纖維(g),
      "portion": "份量描述",
      "confidence": "高/中/低"
    }
  ],
  "totalCalories": 總卡路里,
  "totalProtein": 總蛋白質,
  "totalCarbs": 總碳水化合物,
  "totalFat": 總脂肪,
  "totalFiber": 總膳食纖維,
  "mealType": "早餐/午餐/晚餐/點心/宵夜",
  "source": "路邊攤/便當/公司便當/自煮/超商/餐廳/其他",
  "restaurantName": "餐廳名稱",
  "date": "",
  "note": "備註（如：此為官方公布的營養資訊 / 此為估算值）"
}

## 規則
- 如果是套餐，將套餐中的每個品項分開列出
- 卡路里和營養素的數字要合理
- 如果是品牌食物，confidence 設為「高」
- 如果是一般食物估算，confidence 設為「中」
- 回傳純 JSON，不要有任何其他文字`;
}

/** 分析食物圖片 */
export async function analyzeFood(
  imageBase64: string,
  mimeType: string,
  scaleHint: string = '',
  hintText: string = '',
  afterImageBase64?: string,
  afterMimeType?: string
): Promise<FoodData> {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) {
    throw new Error('GEMINI_API_KEY 未設定');
  }

  const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
  const prompt = afterImageBase64
    ? buildBeforeAfterFoodPrompt(scaleHint, hintText)
    : buildFoodPrompt(scaleHint, hintText);

  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentParts: any[] = [{ text: prompt }];

        contentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        });

        if (afterImageBase64 && afterMimeType) {
          contentParts.push({
            inlineData: {
              mimeType: afterMimeType,
              data: afterImageBase64,
            },
          });
        }

        const result = await model.generateContent(contentParts);
        const response = await result.response;
        const text = response.text();
        console.log("Raw text response from Gemini:", text);

        const cleaned = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        const parsed: FoodData = JSON.parse(cleaned);

        if (!parsed.totalCalories || parsed.totalCalories <= 0) {
          throw new Error('卡路里辨識失敗：數值為 0 或負數');
        }

        parsed.date = parsed.date || '';

        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Key (${apiKey.substring(0, 8)}...) + Model ${modelName} 失敗:`, lastError.message);
        continue;
      }
    }
  }

  throw new Error(`全部 API Keys 與模型皆失敗。最後錯誤: ${lastError?.message}`);
}

/** 搜尋品牌餐廳/食物的營養資訊 */
export async function searchFood(query: string): Promise<FoodData> {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) {
    throw new Error('GEMINI_API_KEY 未設定');
  }

  const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
  const prompt = buildSearchPrompt(query);

  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent([{ text: prompt }]);
        const response = await result.response;
        const text = response.text();

        const cleaned = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        const parsed: FoodData = JSON.parse(cleaned);

        if (!parsed.totalCalories || parsed.totalCalories <= 0) {
          throw new Error('查詢失敗：無法取得營養資訊');
        }

        parsed.date = '';

        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Key (${apiKey.substring(0, 8)}...) + Model ${modelName} 失敗:`, lastError.message);
        continue;
      }
    }
  }

  throw new Error(`全部 API Keys 與模型皆失敗。最後錯誤: ${lastError?.message}`);
}

// ==========================================
// InBody 多圖解析
// ==========================================

/** 建立 InBody 解析 Prompt */
function buildInBodyPrompt(hintText?: string): string {
  return `你是一位專業的健康數據分析師。以下是使用者的 InBody 身體組成報告截圖（可能有多張），請仔細辨識所有數值。

${hintText ? `## 輔助提示說明\n使用者提供了以下文字說明輔助判斷：「${hintText}」。\n請優先比對截圖數據，並參考此文字說明進行精確解析（例如補足日期、身高或特別備註說明）。\n` : ''}

## 回傳格式
請嚴格以 JSON 格式回傳，不要包含 markdown 標記或其他文字：

{
  "date": "檢測日期 (YYYY-MM-DD)",
  "score": InBody評分,
  "weight": 體重(kg),
  "bodyFatPercent": 體脂率(%),
  "bmi": BMI,
  "skeletalMuscleMass": 骨骼肌重(kg),
  "bodyFatMass": 體脂肪重(kg),
  "totalBodyWater": 總水重(L),
  "protein": 蛋白質重(kg),
  "minerals": 礦物質重(kg),
  "leanBodyMass": 除脂體重(kg),
  "bmr": 基礎代謝率(kcal),
  "whr": 腰臀圍比,
  "visceralFatLevel": 內臟脂肪級別,
  "obesityDegree": 肥胖度(%),
  "smi": SMI(kg/m²),
  "recommendedCalorie": 建議熱量攝取(kcal),
  "targetWeight": 目標體重(kg),
  "fatControl": 脂肪控制(kg, 負值代表需減少),
  "muscleControl": 肌肉控制(kg),
  "segmentalMuscle": {
    "leftArm": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "rightArm": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "trunk": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "leftLeg": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "rightLeg": { "weight": kg, "percentage": %, "rating": "正常/高/低" }
  },
  "segmentalFat": {
    "leftArm": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "rightArm": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "trunk": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "leftLeg": { "weight": kg, "percentage": %, "rating": "正常/高/低" },
    "rightLeg": { "weight": kg, "percentage": %, "rating": "正常/高/低" }
  },
  "warnings": ["如有欄位無法辨識或截圖不足，在此列出警告"]
}

## 辨識規則
1. 所有數值欄位如果在截圖中**看不到或無法辨識**，該欄位請回傳 null（不要猜測或填 0）
2. 檢查截圖是否包含以下區塊，如果缺少任何區塊，請在 warnings 中提醒：
   - InBody 評分（含檢測日期）
   - 身體組成（水重、蛋白質、礦物質、體脂肪）
   - 肌肉脂肪分析
   - 部位別肌肉分析
   - 部位別脂肪分析
   - 體重控制
   - 研究參數（BMR、SMI、建議熱量等）
3. 如果只有少量截圖（如只有 1 張），在 warnings 中提醒使用者可能需要補充更多截圖以取得完整數據
4. 日期格式請統一為 YYYY-MM-DD
5. 回傳純 JSON，不要有任何其他文字`;
}

/** 分析 InBody 截圖 (支援多圖) */
export async function analyzeInBody(
  images: { base64: string; mimeType: string }[],
  hintText?: string
): Promise<InBodyData> {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) throw new Error('GEMINI_API_KEY 未設定');

  const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
  const prompt = buildInBodyPrompt(hintText);
  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [
          { text: prompt },
          ...images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.base64 },
          })),
        ];
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const rawParsed = JSON.parse(cleaned);
        const parsed: InBodyData = inBodyDataSchema.parse(rawParsed);
        if (!parsed.warnings) parsed.warnings = [];
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.warn(`InBody Key (${apiKey.substring(0, 8)}...) + Model ${modelName} 失敗:`, lastError.message);
        continue;
      }
    }
  }
  throw new Error(`InBody 分析失敗。最後錯誤: ${lastError?.message}`);
}

// ==========================================
// 飲食交叉分析
// ==========================================

/** 建立飲食交叉分析 Prompt */
function buildDietAnalysisPrompt(
  inbodyJson: string,
  foodRecordsJson: string,
  period: '7days' | '30days'
): string {
  const periodLabel = period === '7days' ? '近 7 天' : '近 30 天';
  return `你是一位專業營養師。以下是使用者最新的 InBody 身體組成數據，以及${periodLabel}的飲食紀錄。請根據這些資料做交叉分析，給出專業的飲食建議。

## 使用者 InBody 數據
${inbodyJson}

## ${periodLabel}飲食紀錄
${foodRecordsJson}

## 回傳格式
請嚴格以 JSON 回傳：
{
  "period": "${period}",
  "summary": "一段簡潔的飲食總結 (2-3 句話)",
  "calorieAssessment": "針對熱量攝取與 InBody 建議熱量的對比評估",
  "macroAssessment": "蛋白質/碳水/脂肪的比例是否適當的評估",
  "strengths": ["飲食優點1", "飲食優點2"],
  "concerns": ["需注意事項1", "需注意事項2"],
  "suggestions": ["改善建議1", "改善建議2", "改善建議3"]
}

## 分析要點
1. **熱量對比**：實際平均攝取 vs InBody 建議的每日攝取熱量，差距是否合理
2. **蛋白質攝取**：根據體重和骨骼肌重，計算每公斤體重蛋白質攝取量，是否達到 1.2-1.6g/kg 建議範圍
3. **脂肪攝取**：體脂率偏高時，脂肪攝取比例是否仍然過高
4. **膳食纖維**：是否達到每日 25g 的建議量
5. **飲食均衡**：是否有營養素明顯不足或過量
6. **具體可行建議**：建議需要具體且可操作（例如「每餐增加一份拳頭大小的蛋白質」而非「多吃蛋白質」）
7. 如飲食紀錄不足 3 天，在 summary 中提醒數據量可能不足以做出精準分析

回傳純 JSON，不要有任何其他文字`;
}

/** 分析飲食與 InBody 的交叉關聯 */
export async function analyzeDiet(
  inbodyData: InBodyData,
  foodRecords: FoodRecord[],
  period: '7days' | '30days'
): Promise<DietAnalysis> {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) throw new Error('GEMINI_API_KEY 未設定');

  const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);

  // 精簡飲食記錄以避免超出 token 限制
  const simplifiedRecords = foodRecords.map(r => ({
    date: r.date,
    foodName: r.foodName,
    totalCalories: r.totalCalories,
    totalProtein: r.totalProtein,
    totalCarbs: r.totalCarbs,
    totalFat: r.totalFat,
    totalFiber: r.totalFiber,
    mealType: r.mealType,
    source: r.source,
  }));

  const prompt = buildDietAnalysisPrompt(
    JSON.stringify(inbodyData),
    JSON.stringify(simplifiedRecords),
    period
  );

  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([{ text: prompt }]);
        const response = await result.response;
        const text = response.text();
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const rawParsed = JSON.parse(cleaned);
        const parsed: DietAnalysis = dietAnalysisSchema.parse(rawParsed);
        parsed.generatedAt = new Date().toISOString();
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Diet analysis Key (${apiKey.substring(0, 8)}...) + Model ${modelName} 失敗:`, lastError.message);
        continue;
      }
    }
  }
  throw new Error(`飲食分析失敗。最後錯誤: ${lastError?.message}`);
}
