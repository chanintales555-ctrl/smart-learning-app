import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserEnglishPretest, saveUserEnglishPretest } from '@/lib/userStore';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          data: null,
        },
        { status: 200 }
      );
    }

    const userId =
      (session.user as any).id || session.user.name || session.user.email || 'user';
    const data = await getUserEnglishPretest(userId);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: userId,
          name: session.user.name || userId,
          email: session.user.email || '-',
        },
        data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/english-pretest error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error?.message || 'Failed to load English Pre-Test data',
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
          error: 'กรุณาเข้าสู่ระบบเพื่อบันทึกผลคะแนนผูกกับบัญชีผู้ใช้',
        },
        { status: 401 }
      );
    }

    const userId =
      (session.user as any).id || session.user.name || session.user.email || 'user';
    const body = await req.json();

    const result = await saveUserEnglishPretest(userId, {
      userName: session.user.name || userId,
      answers: body.answers || {},
      questionTimes: body.questionTimes || {},
      flagged: body.flagged || [],
      isSubmitted: Boolean(body.isSubmitted),
      elapsedSeconds: Number(body.elapsedSeconds) || 0,
      latestSummary: body.latestSummary || null,
      history: body.history || [],
    });

    return NextResponse.json(
      {
        ok: result.ok,
        authenticated: true,
        userId,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/english-pretest error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to save English Pre-Test data',
      },
      { status: 500 }
    );
  }
}
