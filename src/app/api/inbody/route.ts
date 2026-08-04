import { NextRequest, NextResponse } from 'next/server';
import { analyzeInBody } from '@/lib/gemini';
import { getAllInBodyRecords, createInBodyRecord, deleteInBodyRecord } from '@/lib/notion';
import { InBodyData } from '@/lib/types';

// Allow larger body for multi-image uploads & longer processing time for Gemini
export const maxDuration = 60;

/** POST — 多圖 AI 分析 InBody 截圖 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, hintText } = body as {
      images: { base64: string; mimeType: string }[];
      hintText?: string;
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ success: false, error: '請至少上傳一張 InBody 截圖' }, { status: 400 });
    }

    // strip data url prefix
    const cleaned = images.map(img => ({
      base64: img.base64.includes(',') ? img.base64.split(',')[1] : img.base64,
      mimeType: img.mimeType,
    }));

    let mounjaroContext = '';
    try {
      const { getAllMounjaroRecords } = await import('@/lib/notion');
      const mRecords = await getAllMounjaroRecords();
      if (mRecords.length > 0) {
        const recent = mRecords.slice(0, 10).map(r => `${r.date}: ${r.dose}mg`).join(', ');
        mounjaroContext = `使用者目前正在施打猛健樂 (Tirzepatide)，最近幾次的施打紀錄為：${recent}。`;
      }
    } catch (e) {
      console.error('Failed to load Mounjaro context for AI:', e);
    }

    const data = await analyzeInBody(cleaned, hintText, mounjaroContext);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('InBody 分析錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'InBody 分析失敗',
    }, { status: 500 });
  }
}

/** GET — 取得所有 InBody 紀錄 */
export async function GET() {
  try {
    const records = await getAllInBodyRecords();
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('讀取 InBody 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '讀取 InBody 紀錄失敗',
    }, { status: 500 });
  }
}

/** PUT — 確認儲存 InBody 數據至 Notion */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body as InBodyData;
    const pageId = await createInBodyRecord(data);
    return NextResponse.json({ success: true, id: pageId });
  } catch (error) {
    console.error('儲存 InBody 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '儲存 InBody 紀錄失敗',
    }, { status: 500 });
  }
}

/** DELETE — 刪除 InBody 紀錄 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    }
    await deleteInBodyRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('刪除 InBody 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '刪除 InBody 紀錄失敗',
    }, { status: 500 });
  }
}
