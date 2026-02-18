import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
try {
const { name, email } = await req.json();

} catch (error) {
console.error('Error:', error);
return NextResponse.json({ error: 'Failed' }, { status: 500 });
}
}