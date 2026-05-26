
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
// Assuming you have your NextAuth options defined in a file like this
// If not, you'll need to import them directly
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  // 1. Check for user session
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.name || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get the Google Sheet URL from environment variables
  const sheetsUrl = process.env.GOOGLE_SHEET_URL;
  if (!sheetsUrl) {
    console.error("GOOGLE_SHEET_URL is not defined in .env.local");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // 3. Get the data from the client's request
    const clientData = await req.json();
    const { subject, chapter, results } = clientData;

    // 4. Construct the payload securely on the server
    const payload = {
      userId: session.user.name, // Use the secure, server-verified user name
      subject: subject,
      chapter: chapter,
      attemptId: `ATT-${session.user.email.split("@")[0]}-${Date.now()}`, // Use secure user email
      results: results,
    };

    // 5. Send the data to Google Sheets
    const response = await fetch(sheetsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Google Apps Script with 'no-cors' from the client usually redirects.
    // When called from a server, we can actually see the response.
    // A successful POST to a simple Apps Script often results in a 302 redirect.
    if (response.ok || response.status === 302) {
      return NextResponse.json({ success: true });
    } else {
      // Log the actual response from Google for debugging
      console.error("Google Sheets API Error:", await response.text());
      return NextResponse.json(
        { error: "Failed to submit to Google Sheets" },
        { status: response.status }
      );
    }
  } catch (err) {
    console.error("Internal Server Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
