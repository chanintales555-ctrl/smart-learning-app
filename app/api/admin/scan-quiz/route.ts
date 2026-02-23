import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// ดึง API Key จาก ENV
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: "กรุณาเลือกรูปภาพ" }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json({ error: "ไม่พบ API Key ในระบบ" }, { status: 500 });
    }

    // แปลงไฟล์รูปภาพ
    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    // ใช้โมเดล gemini-2.0-flash ที่รองรับภาพได้ดี
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `Analyze this quiz question image and extract data into JSON format in Thai:
    {
      "questionText": "โจทย์ภาษาไทย (ใช้ [n] แทนการขึ้นบรรทัดใหม่)",
      "optionA": "ตัวเลือก ก",
      "optionB": "ตัวเลือก ข",
      "optionC": "ตัวเลือก ค",
      "optionD": "ตัวเลือก ง",
      "optionE": "ตัวเลือก จ (ถ้ามี)",
      "correct": "A, B, C, D, or E"
    }
    Return ONLY JSON code.`;

    // ส่งข้อมูลไปที่ Gemini โดยใช้ความพยายามสูงสุด
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: image.type,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    
    // ทำความสะอาด JSON เผื่อ AI ใส่ ```json ... ``` มา
    const cleanJson = text.replace(/```json|```/g, "").trim();
    
    try {
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("JSON Parse Error:", text);
      return NextResponse.json({ error: "AI ส่งข้อมูลกลับมาผิดรูปแบบ", raw: text }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // แยกแยะสาเหตุของ Error ให้ชัดเจนขึ้น
    let errorMessage = "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
    if (error.message?.includes("fetch failed")) {
      errorMessage = "เน็ตของคุณ Nitro หลุดหรือถูกบล็อกระหว่างส่งข้อมูล (Network Timeout)";
    } else if (error.message?.includes("API key not valid")) {
      errorMessage = "รหัส API Key ในไฟล์ .env.local ไม่ถูกต้อง";
    }

    return NextResponse.json({ 
      error: errorMessage, 
      details: error.message 
    }, { status: 500 });
  }
}