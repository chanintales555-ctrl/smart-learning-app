import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/userStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, email, password, isGoogleOAuth } = body;

    const result = await registerUser({
      userId: userId || name,
      name: name || userId,
      email: email || '-',
      password,
      isGoogleOAuth: Boolean(isGoogleOAuth),
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: 'Error', error: result.error || 'ไม่สามารถสมัครสมาชิกได้' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Success',
        user: {
          userId: result.user?.userId,
          name: result.user?.name,
          email: result.user?.email,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Register Error:', error?.message || error);
    return NextResponse.json(
      { message: 'Error', error: error?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}