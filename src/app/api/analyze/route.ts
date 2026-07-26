import { NextRequest, NextResponse } from 'next/server';
import { analyzeFood } from '@/lib/gemini';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip, 5, 60000)) {
      return NextResponse.json({ success: false, error: '請求過於頻繁，請稍後再試' }, { status: 429 });
    }

    const body = await request.json();
    const { image, mimeType, scaleHint, hintText, exifDate, exifMealType, scanMode, afterImage, afterMimeType } = body;

    if (!image) {
      return NextResponse.json({ success: false, error: '未提供圖片' }, { status: 400 });
    }

    // 移除 data URL 前綴
    const base64 = image.includes(',') ? image.split(',')[1] : image;

    let afterBase64 = undefined;
    if (afterImage) {
      afterBase64 = afterImage.includes(',') ? afterImage.split(',')[1] : afterImage;
    }

    let finalHintText = hintText || '';
    if (scanMode === 'nutrition_label') {
      finalHintText = `[強制] 這是一張營養標示表的照片。請不要猜測食物外觀，而是精確讀取表格上的「每份」熱量/蛋白質/碳水/脂肪，並乘以「本包裝含幾份」，換算出整個包裝的「總數值」。請嚴格 100% 依照表格數字作答！使用者附加備註：${hintText || '無'}`;
    }

    const data = await analyzeFood(
      base64,
      mimeType || 'image/jpeg',
      scaleHint || '',
      finalHintText,
      afterBase64,
      afterMimeType
    );

    // 如果前端解析出了精準的相片 EXIF 時間，直接複寫 AI 的猜測
    if (exifDate) data.date = exifDate;
    if (exifMealType) data.mealType = exifMealType;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('食物分析失敗:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
