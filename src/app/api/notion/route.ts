import { NextRequest, NextResponse } from 'next/server';
import { getAllFoodRecords, createFoodRecord, updateFoodRecord, deleteFoodRecord } from '@/lib/notion';

/** GET — 取得所有食物記錄 */
export async function GET() {
  try {
    const records = await getAllFoodRecords();
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('取得記錄失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/** POST — 新增食物記錄 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await createFoodRecord(body);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('新增記錄失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/** DELETE — 刪除食物記錄 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    }

    await deleteFoodRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('刪除記錄失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}


/** PUT — 更新食物記錄 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    }

    const body = await request.json();
    await updateFoodRecord(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新記錄失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
