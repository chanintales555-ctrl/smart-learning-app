import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY 
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // บันทึกลงตาราง Column A=UserID, B=Email, C=Pass, D=Name, E=Date
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:E', 
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          name,           // Col A: User ID
          email || "-",   // Col B: Email
          password,       // Col C: Password
          name,           // Col D: Name
          new Date().toLocaleString('th-TH') // Col E: Date
        ]],
      },
    });

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error: any) {
    console.error("Register Error:", error.message);
    return NextResponse.json({ message: "Error", error: error.message }, { status: 500 });
  }
}