import { NextRequest, NextResponse } from 'next/server';
import { getAllMounjaroRecords, createMounjaroRecord } from '@/lib/notion';

export async function GET() {
  try {
    const records = await getAllMounjaroRecords();
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('讀取 Mounjaro 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '讀取 Mounjaro 紀錄失敗',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, dose } = body;
    
    if (!date || typeof dose !== 'number') {
      return NextResponse.json({ success: false, error: '缺少 date 或 dose' }, { status: 400 });
    }

    const id = await createMounjaroRecord(date, dose);
    return NextResponse.json({ success: true, data: { id, date, dose } });
  } catch (error) {
    console.error('新增 Mounjaro 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '新增 Mounjaro 紀錄失敗',
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    }

    const { deleteMounjaroRecord } = await import('@/lib/notion');
    const success = await deleteMounjaroRecord(id);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: '刪除失敗' }, { status: 500 });
    }
  } catch (error) {
    console.error('刪除 Mounjaro 紀錄錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '刪除 Mounjaro 紀錄失敗',
    }, { status: 500 });
  }
}
