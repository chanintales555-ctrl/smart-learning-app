import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const formattedText = body.questionText.replace(/\n/g, '[n]');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'QuizData!A:K', // A=ID, B=Sub, C=Chap, D=Text, E=Img, F=A, G=B, H=C, I=D, J=E, K=Correct
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          body.questionId, body.subject, body.chapter,
          formattedText, body.imageUrl,
          body.optionA, body.optionB, body.optionC, body.optionD, body.optionE,
          body.correct
        ]],
      },
    });

    return NextResponse.json({ message: 'Success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}