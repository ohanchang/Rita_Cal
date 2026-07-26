import { NextRequest, NextResponse } from 'next/server';
import { analyzeDiet } from '@/lib/gemini';
import { getAllInBodyRecords, getAllFoodRecords, appendAdviceToInBodyPage } from '@/lib/notion';
import { isRateLimited } from '@/lib/rate-limit';

/** POST — AI 交叉分析飲食與 InBody 數據 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip, 3, 60000)) {
      return NextResponse.json({ success: false, error: '請求過於頻繁，請稍後再試' }, { status: 429 });
    }

    const body = await request.json();
    const { period } = body as { period: '7days' | '30days' };

    if (!period || !['7days', '30days'].includes(period)) {
      return NextResponse.json({ success: false, error: '請指定 period (7days/30days)' }, { status: 400 });
    }

    // 取得最新 InBody 紀錄
    const inbodyRecords = await getAllInBodyRecords();
    if (inbodyRecords.length === 0) {
      return NextResponse.json({ success: false, error: '尚無 InBody 紀錄，請先上傳 InBody 數據' }, { status: 400 });
    }
    const latestInBody = inbodyRecords[0]; // 已按日期降序排列

    // 取得近 N 天飲食記錄
    const allFoodRecords = await getAllFoodRecords();
    const days = period === '7days' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentRecords = allFoodRecords.filter(r => r.date >= cutoff);

    // 呼叫 Gemini 做飲食交叉分析
    const analysis = await analyzeDiet(latestInBody, recentRecords, period);

    // 背景寫入 Notion (Fire and forget)
    // 我們將 AI 分析報告儲存在最新一筆 InBody 紀錄的頁面 Block 內
    if (latestInBody.id) {
      appendAdviceToInBodyPage(latestInBody.id, [
        `總結: ${analysis.summary}`,
        `熱量評估: ${analysis.calorieAssessment}`,
        `營養素評估: ${analysis.macroAssessment}`,
        `優點: ${analysis.strengths.join('、')}`,
        `需注意: ${analysis.concerns.join('、')}`,
        ...analysis.suggestions.map(s => `- ${s}`)
      ].join('\n')).catch(console.error);
    }

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error('飲食分析錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '飲食分析失敗',
    }, { status: 500 });
  }
}
