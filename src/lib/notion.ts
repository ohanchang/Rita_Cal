import { Client } from '@notionhq/client';
import { FoodData, FoodRecord, InBodyData, InBodyRecord } from './types';

/** 取得 Notion Token */
function getToken(): string {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) throw new Error('NOTION_TOKEN 未設定');
  return token;
}

/** 取得 Notion Client */
function getNotionClient(): Client {
  return new Client({ auth: getToken() });
}

/** 取得 Database ID */
function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID?.trim();
  if (!id) throw new Error('NOTION_DATABASE_ID 未設定');
  return id;
}

/** 安全讀取 Notion property 值 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPropertyValue(property: any, type: string): any {
  if (!property) return '';

  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text || property.rich_text?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || property.title?.[0]?.plain_text || '';
    case 'number':
      return property.number ?? 0;
    case 'date':
      return property.date?.start || '';
    case 'select':
      return property.select?.name || '';
    default:
      return '';
  }
}

/** Notion page → FoodRecord */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pageToRecord(page: any): FoodRecord {
  const props = page.properties;

  // 嘗試解析品項明細 JSON
  let items = [];
  try {
    const itemsStr = getPropertyValue(props['品項明細'], 'rich_text');
    if (itemsStr) {
      items = JSON.parse(itemsStr);
    }
  } catch {
    items = [];
  }

  return {
    id: page.id,
    foodName: getPropertyValue(props['食物名稱'], 'title'),
    items: items,
    totalCalories: getPropertyValue(props['總卡路里'], 'number'),
    totalProtein: getPropertyValue(props['蛋白質'], 'number'),
    totalCarbs: getPropertyValue(props['碳水化合物'], 'number'),
    totalFat: getPropertyValue(props['脂肪'], 'number'),
    totalFiber: getPropertyValue(props['膳食纖維'], 'number'),
    mealType: getPropertyValue(props['用餐類型'], 'select') || '午餐',
    source: getPropertyValue(props['來源'], 'select') || '其他',
    restaurantName: getPropertyValue(props['餐廳名稱'], 'rich_text'),
    date: getPropertyValue(props['日期'], 'date'),
    note: getPropertyValue(props['備註'], 'rich_text'),
    overallConfidence: '中',
    createdAt: page.created_time,
  };
}

/** 取得所有食物記錄（含分頁） */
export async function getAllFoodRecords(): Promise<FoodRecord[]> {
  const databaseId = getDatabaseId();

  const records: FoodRecord[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRes: any = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ property: '日期', direction: 'descending' }],
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });

    if (!rawRes.ok) {
      const errorText = await rawRes.text();
      throw new Error(`Notion API 錯誤 (${rawRes.status}): ${errorText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await rawRes.json();

    for (const page of response.results) {
      records.push(pageToRecord(page));
    }

    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return records;
}

/** 將 items 陣列序列化為安全的 JSON 字串（不超過 2000 字元）
 * 策略：先壓縮欄位，若仍超長則逐一移除末尾品項，確保 JSON 合法 */
function serializeItems(items: FoodData['items']): string {
  if (!items || items.length === 0) return '[]';
  // 只保留核心欄位，壓縮 confidence/portion 等描述性欄位
  const slim = items.map(({ name, calories, protein, carbs, fat, fiber }) => ({
    name, calories, protein, carbs, fat, fiber,
  }));
  let json = JSON.stringify(slim);
  if (json.length <= 2000) return json;
  // 若仍超過，逐一移除最後一個品項直到符合長度
  const trimmed = [...slim];
  while (trimmed.length > 0 && json.length > 1950) {
    trimmed.pop();
    json = JSON.stringify(trimmed);
  }
  return json;
}

/** 新增食物記錄到 Notion */
export async function createFoodRecord(data: FoodData): Promise<string> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();

  const itemsJson = serializeItems(data.items);

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      '食物名稱': {
        title: [{ text: { content: data.foodName || '未命名' } }],
      },
      '品項明細': {
        rich_text: [{ text: { content: itemsJson } }],
      },
      '總卡路里': {
        number: data.totalCalories || 0,
      },
      '蛋白質': {
        number: data.totalProtein || 0,
      },
      '碳水化合物': {
        number: data.totalCarbs || 0,
      },
      '脂肪': {
        number: data.totalFat || 0,
      },
      '膳食纖維': {
        number: data.totalFiber || 0,
      },
      '用餐類型': {
        select: { name: data.mealType || '午餐' },
      },
      '來源': {
        select: { name: data.source || '其他' },
      },
      ...(data.restaurantName ? {
        '餐廳名稱': {
          rich_text: [{ text: { content: data.restaurantName } }],
        },
      } : {}),
      ...(data.date ? {
        '日期': {
          date: { start: data.date },
        },
      } : {}),
      '備註': {
        rich_text: [{ text: { content: data.note || '' } }],
      },
    },
  });

  return response.id;
}

/** 更新食物記錄 */
export async function updateFoodRecord(
  pageId: string,
  data: Partial<FoodData>
): Promise<void> {
  const notion = getNotionClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};

  if (data.foodName !== undefined) {
    properties['食物名稱'] = { title: [{ text: { content: data.foodName } }] };
  }
  if (data.items !== undefined) {
    properties['品項明細'] = {
      rich_text: [{ text: { content: serializeItems(data.items) } }],
    };
  }
  if (data.totalCalories !== undefined) {
    properties['總卡路里'] = { number: data.totalCalories };
  }
  if (data.totalProtein !== undefined) {
    properties['蛋白質'] = { number: data.totalProtein };
  }
  if (data.totalCarbs !== undefined) {
    properties['碳水化合物'] = { number: data.totalCarbs };
  }
  if (data.totalFat !== undefined) {
    properties['脂肪'] = { number: data.totalFat };
  }
  if (data.totalFiber !== undefined) {
    properties['膳食纖維'] = { number: data.totalFiber };
  }
  if (data.mealType !== undefined) {
    properties['用餐類型'] = { select: { name: data.mealType } };
  }
  if (data.source !== undefined) {
    properties['來源'] = { select: { name: data.source } };
  }
  if (data.restaurantName !== undefined) {
    properties['餐廳名稱'] = { rich_text: [{ text: { content: data.restaurantName } }] };
  }
  if (data.date !== undefined) {
    properties['日期'] = { date: { start: data.date } };
  }
  if (data.note !== undefined) {
    properties['備註'] = { rich_text: [{ text: { content: data.note } }] };
  }

  await notion.pages.update({
    page_id: pageId,
    properties,
  });
}

/** 刪除食物記錄 */
export async function deleteFoodRecord(pageId: string): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

// ==========================================
// InBody 身體組成 CRUD
// ==========================================

/** 取得 InBody Database ID */
function getInBodyDatabaseId(): string {
  const id = process.env.NOTION_INBODY_DATABASE_ID?.trim();
  if (!id) throw new Error('NOTION_INBODY_DATABASE_ID 未設定');
  return id;
}

/** Notion page → InBodyRecord */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pageToInBodyRecord(page: any): InBodyRecord {
  const props = page.properties;

  let segmentalMuscle = null;
  let segmentalFat = null;
  try {
    const segStr = getPropertyValue(props['部位別數據'], 'rich_text');
    if (segStr) {
      const parsed = JSON.parse(segStr);
      segmentalMuscle = parsed.muscle || null;
      segmentalFat = parsed.fat || null;
    }
  } catch { /* ignore */ }

  return {
    id: page.id,
    date: getPropertyValue(props['檢測日期'], 'date'),
    score: getPropertyValue(props['InBody評分'], 'number') || null,
    weight: getPropertyValue(props['體重'], 'number') || null,
    bodyFatPercent: getPropertyValue(props['體脂率'], 'number') || null,
    bmi: getPropertyValue(props['BMI'], 'number') || null,
    skeletalMuscleMass: getPropertyValue(props['骨骼肌重'], 'number') || null,
    bodyFatMass: getPropertyValue(props['體脂肪重'], 'number') || null,
    totalBodyWater: getPropertyValue(props['總水重'], 'number') || null,
    protein: getPropertyValue(props['蛋白質重'], 'number') || null,
    minerals: getPropertyValue(props['礦物質重'], 'number') || null,
    leanBodyMass: getPropertyValue(props['除脂體重'], 'number') || null,
    bmr: getPropertyValue(props['基礎代謝率'], 'number') || null,
    whr: getPropertyValue(props['腰臀圍比'], 'number') || null,
    visceralFatLevel: getPropertyValue(props['內臟脂肪級別'], 'number') || null,
    obesityDegree: getPropertyValue(props['肥胖度'], 'number') || null,
    smi: getPropertyValue(props['SMI'], 'number') || null,
    recommendedCalorie: getPropertyValue(props['建議熱量攝取'], 'number') || null,
    targetWeight: getPropertyValue(props['目標體重'], 'number') || null,
    fatControl: getPropertyValue(props['脂肪控制'], 'number') || null,
    muscleControl: getPropertyValue(props['肌肉控制'], 'number') || null,
    segmentalMuscle,
    segmentalFat,
    warnings: [],
    createdAt: page.created_time,
  };
}

/** 取得所有 InBody 紀錄 */
export async function getAllInBodyRecords(): Promise<InBodyRecord[]> {
  const databaseId = getInBodyDatabaseId();
  const records: InBodyRecord[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRes: any = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ property: '檢測日期', direction: 'descending' }],
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });

    if (!rawRes.ok) {
      const errorText = await rawRes.text();
      throw new Error(`Notion InBody API 錯誤 (${rawRes.status}): ${errorText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await rawRes.json();
    for (const page of response.results) {
      records.push(pageToInBodyRecord(page));
    }
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return records;
}

/** 新增 InBody 紀錄到 Notion */
export async function createInBodyRecord(data: InBodyData): Promise<string> {
  const notion = getNotionClient();
  const databaseId = getInBodyDatabaseId();

  const segmentalJson = JSON.stringify({
    muscle: data.segmentalMuscle,
    fat: data.segmentalFat,
  });

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      '檢測日期': { date: { start: data.date || new Date().toISOString().split('T')[0] } },
      'InBody評分': { number: data.score ?? 0 },
      '體重': { number: data.weight ?? 0 },
      '體脂率': { number: data.bodyFatPercent ?? 0 },
      'BMI': { number: data.bmi ?? 0 },
      '骨骼肌重': { number: data.skeletalMuscleMass ?? 0 },
      '體脂肪重': { number: data.bodyFatMass ?? 0 },
      '總水重': { number: data.totalBodyWater ?? 0 },
      '蛋白質重': { number: data.protein ?? 0 },
      '礦物質重': { number: data.minerals ?? 0 },
      '除脂體重': { number: data.leanBodyMass ?? 0 },
      '基礎代謝率': { number: data.bmr ?? 0 },
      '腰臀圍比': { number: data.whr ?? 0 },
      '內臟脂肪級別': { number: data.visceralFatLevel ?? 0 },
      '肥胖度': { number: data.obesityDegree ?? 0 },
      'SMI': { number: data.smi ?? 0 },
      '建議熱量攝取': { number: data.recommendedCalorie ?? 0 },
      '目標體重': { number: data.targetWeight ?? 0 },
      '脂肪控制': { number: data.fatControl ?? 0 },
      '肌肉控制': { number: data.muscleControl ?? 0 },
      '部位別數據': {
        rich_text: [{ text: { content: segmentalJson.length <= 2000 ? segmentalJson : segmentalJson.substring(0, 1990) + '…' } }],
      },
    },
  });

  return response.id;
}

/** 刪除 InBody 紀錄 */
export async function deleteInBodyRecord(pageId: string): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

// ==========================================
// 附加 AI 建議
// ==========================================

/** 將 AI 飲食建議儲存至該次 InBody 的頁面內文 */
export async function appendAdviceToInBodyPage(pageId: string, markdownText: string): Promise<void> {
  const notion = getNotionClient();
  
  const paragraphs = markdownText.split('\n')
    .map(p => p.trim())
    .filter(p => p !== '');
    
  const blocks = paragraphs.slice(0, 90).map(text => ({
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [{ type: 'text' as const, text: { content: text.substring(0, 2000) } }]
    }
  }));

  if (blocks.length === 0) return;

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: `🤖 AI 飲食建議 (${new Date().toLocaleDateString('zh-TW')})` } }] }
      },
      ...blocks,
      {
        object: 'block',
        type: 'divider',
        divider: {}
      }
    ]
  });
}
