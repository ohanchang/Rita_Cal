import { NextRequest, NextResponse } from 'next/server';
import { searchFood } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ success: false, error: '請輸入搜尋內容' }, { status: 400 });
    }

    const data = await searchFood(query.trim());

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('搜尋失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
