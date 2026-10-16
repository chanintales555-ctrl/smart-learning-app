import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserSmartboardNotes, saveUserSmartboardNotes } from '@/lib/userStore';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          annotations: null,
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId') || 'chemistry-acid-base';
    const userId =
      (session.user as any).id || session.user.name || session.user.email || 'user';

    const { annotations, updatedAt } = await getUserSmartboardNotes(userId, lessonId);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: userId,
          name: session.user.name || userId,
          email: session.user.email || '-',
        },
        lessonId,
        annotations,
        updatedAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error?.message || 'Failed to load user notes',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          error: 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูลลายมือเข้าบัญชีครับ',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const lessonId = body.lessonId || 'chemistry-acid-base';
    const annotations = body.annotations || {};
    const userId =
      (session.user as any).id || session.user.name || session.user.email || 'user';

    const result = await saveUserSmartboardNotes(userId, lessonId, annotations);

    return NextResponse.json(
      {
        ok: result.ok,
        authenticated: true,
        userId,
        lessonId,
        updatedAt: result.updatedAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to save user notes',
      },
      { status: 500 }
    );
  }
}
