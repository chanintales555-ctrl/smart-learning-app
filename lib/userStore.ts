import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface StoredUser {
  userId: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_USERS_FILE = path.join(LOCAL_DATA_DIR, 'users.json');
const LOCAL_NOTES_FILE = path.join(LOCAL_DATA_DIR, 'smartboard_notes.json');
const LOCAL_ENGLISH_PRETEST_FILE = path.join(LOCAL_DATA_DIR, 'english_pretest_scores.json');

function sanitizeDocId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\/\\.#$\[\]]/g, '_')
    .slice(0, 120);
}

// --- Local JSON Fallback Helpers (for local dev / offline resilience) ---
function readLocalJson<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (e) {
    // Ignore fs errors on read-only serverless environments
  }
  return defaultVal;
}

function writeLocalJson<T>(filePath: string, data: T): boolean {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    // Ignore fs errors on read-only serverless environments (Vercel uses Cloud DB / Google Sheets)
    return false;
  }
}

function hasGoogleSheetsConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID
  );
}

function getGoogleSheetsClient(readonly = false) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '').trim()
        : undefined,
    },
    scopes: [
      readonly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  return google.sheets({ version: 'v4', auth });
}

const SHEET_CHUNK_SIZE = 45000;
const MIN_CHUNK_COLUMNS = 12;

function packCompressedChunks(jsonStr: string): string[] {
  const compressed = 'ZLIB:' + zlib.deflateSync(Buffer.from(jsonStr, 'utf-8')).toString('base64');
  const chunks: string[] = [];
  for (let i = 0; i < compressed.length; i += SHEET_CHUNK_SIZE) {
    chunks.push(compressed.slice(i, i + SHEET_CHUNK_SIZE));
  }
  while (chunks.length < MIN_CHUNK_COLUMNS) {
    chunks.push('');
  }
  return chunks;
}

function unpackCompressedChunks(cells: any[]): string | null {
  if (!Array.isArray(cells) || cells.length === 0) return null;
  const joined = cells
    .map((c) => (c != null ? String(c) : ''))
    .join('')
    .trim();
  if (!joined) return null;
  if (joined.startsWith('ZLIB:')) {
    const buf = Buffer.from(joined.slice(5), 'base64');
    return zlib.inflateSync(buf).toString('utf-8');
  }
  return joined;
}

const memoryNotesCache = new Map<string, { annotationsJson: string; updatedAt: string }>();

// ==========================================
// 1. USER REGISTRATION & AUTHENTICATION
// ==========================================

export async function registerUser(params: {
  userId: string;
  name?: string;
  email?: string;
  password: string;
  isGoogleOAuth?: boolean;
}): Promise<{ ok: boolean; error?: string; user?: StoredUser }> {
  const cleanUserId = (params.userId || params.name || '').trim();
  const cleanName = (params.name || cleanUserId).trim();
  const cleanEmail = (params.email || '-').trim();
  const cleanPassword = (params.password || '').trim();

  if (!cleanUserId || !cleanPassword) {
    return { ok: false, error: 'กรุณากรอก User ID และรหัสผ่านให้ครบถ้วนครับ' };
  }

  const docKey = sanitizeDocId(cleanUserId);
  const nowStr = new Date().toISOString();

  // 1) Check duplicate user in Firestore (unless Google OAuth login upsert)
  if (!params.isGoogleOAuth) {
    try {
      const userRef = doc(db, 'users', docKey);
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        return {
          ok: false,
          error: 'User ID นี้ถูกใช้งานแล้ว กรุณาตั้งชื่อ User ID อื่นครับ',
        };
      }
    } catch (e) {
      console.warn('Firestore duplicate check warning:', e);
    }

    // Check local fallback duplicate
    const localUsers = readLocalJson<Record<string, StoredUser>>(LOCAL_USERS_FILE, {});
    if (localUsers[docKey]) {
      return {
        ok: false,
        error: 'User ID นี้ถูกใช้งานแล้ว กรุณาตั้งชื่อ User ID อื่นครับ',
      };
    }
  }

  const newUser: StoredUser = {
    userId: cleanUserId,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  let savedSomewhere = false;

  // 2) Save to Firebase Firestore (`users` collection)
  try {
    const userRef = doc(db, 'users', docKey);
    await setDoc(userRef, newUser, { merge: true });
    savedSomewhere = true;
  } catch (firestoreErr) {
    console.error('Firestore register save error:', firestoreErr);
  }

  // 3) Save to Local JSON Fallback
  try {
    const localUsers = readLocalJson<Record<string, StoredUser>>(LOCAL_USERS_FILE, {});
    localUsers[docKey] = newUser;
    if (writeLocalJson(LOCAL_USERS_FILE, localUsers)) {
      savedSomewhere = true;
    }
  } catch (localErr) {
    console.warn('Local user store warning:', localErr);
  }

  // 4) Optional: Sync to Google Sheets if credentials are configured
  if (hasGoogleSheetsConfig()) {
    try {
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
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              cleanUserId,
              cleanEmail,
              cleanPassword,
              cleanName,
              new Date().toLocaleString('th-TH'),
            ],
          ],
        },
      });
      savedSomewhere = true;
    } catch (sheetErr) {
      console.warn('Google Sheets optional sync warning:', sheetErr);
    }
  }

  if (!savedSomewhere) {
    return { ok: false, error: 'ไม่สามารถบันทึกข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง' };
  }

  return { ok: true, user: newUser };
}

export async function authenticateUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ id: string; name: string; email: string } | null> {
  const inputUser = (usernameInput || '').trim();
  const inputPass = (passwordInput || '').trim();
  if (!inputUser || !inputPass) return null;

  const docKey = sanitizeDocId(inputUser);

  // 1) Check Firebase Firestore first (Fast O(1) lookup by docKey)
  try {
    const userRef = doc(db, 'users', docKey);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as StoredUser;
      if (data.password === inputPass) {
        return {
          id: data.userId || inputUser,
          name: data.name || data.userId || inputUser,
          email: data.email || '-',
        };
      }
    } else {
      // Fallback scan in Firestore in case doc ID had different casing
      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const d of allUsersSnap.docs) {
        const u = d.data() as StoredUser;
        if (
          u.userId?.trim().toLowerCase() === inputUser.toLowerCase() &&
          u.password?.trim() === inputPass
        ) {
          return {
            id: u.userId,
            name: u.name || u.userId,
            email: u.email || '-',
          };
        }
      }
    }
  } catch (firestoreErr) {
    console.warn('Firestore auth lookup warning:', firestoreErr);
  }

  // 2) Check Local JSON Fallback
  try {
    const localUsers = readLocalJson<Record<string, StoredUser>>(LOCAL_USERS_FILE, {});
    const localMatch = localUsers[docKey];
    if (localMatch && localMatch.password === inputPass) {
      return {
        id: localMatch.userId,
        name: localMatch.name || localMatch.userId,
        email: localMatch.email || '-',
      };
    }
  } catch (e) {}

  // 3) Check Google Sheets if configured (backward-compatible with existing sheet accounts)
  if (hasGoogleSheetsConfig()) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '').trim(),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A2:E',
      });

      const rows = response.data.values;
      if (rows) {
        const matchedRow = rows.find((row) => {
          const dbUser = row[0]?.toString().trim();
          const dbPass = row[2]?.toString().trim();
          return (
            dbUser?.toLowerCase() === inputUser.toLowerCase() && dbPass === inputPass
          );
        });

        if (matchedRow) {
          const foundUser = {
            id: matchedRow[0].toString().trim(),
            name: (matchedRow[3] || matchedRow[0]).toString().trim(),
            email: (matchedRow[1] || '-').toString().trim(),
          };
          // Cache into Firestore for fast future logins
          try {
            await setDoc(
              doc(db, 'users', sanitizeDocId(foundUser.id)),
              {
                userId: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
                password: inputPass,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (e) {}
          return foundUser;
        }
      }
    } catch (sheetErr) {
      console.warn('Google Sheets auth lookup warning:', sheetErr);
    }
  }

  return null;
}

// ==========================================
// 2. SMARTBOARD HANDWRITING NOTES PER ACCOUNT
// ==========================================

async function getRowFromGoogleSheetTab(
  tabName: string,
  docKey: string
): Promise<any[] | null> {
  if (!hasGoogleSheetsConfig()) return null;
  try {
    const sheets = getGoogleSheetsClient(true);
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A1:Z5000`,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) return null;
    let matched: any[] | null = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r && r[0]?.toString().trim() === docKey) {
        matched = r;
      }
    }
    return matched;
  } catch (err) {
    // Tab might not exist yet on first run
    return null;
  }
}

async function saveRowToGoogleSheetTab(
  tabName: string,
  docKey: string,
  rowValues: any[]
): Promise<boolean> {
  if (!hasGoogleSheetsConfig()) return false;
  try {
    const sheets = getGoogleSheetsClient(false);
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    let rows: any[][] = [];
    try {
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A1:D5000`,
      });
      rows = getRes.data.values || [];
    } catch (readErr) {
      // Create the sheet tab if it does not exist yet
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabName,
                  },
                },
              },
            ],
          },
        });
      } catch (addSheetErr) {
        // Ignore if another concurrent request just created it
      }
      rows = [];
    }

    let existingRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[0]?.toString().trim() === docKey) {
        existingRowIndex = i;
        break;
      }
    }

    if (existingRowIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A${existingRowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
    }
    return true;
  } catch (err) {
    console.error(`Google Sheets saveRowToGoogleSheetTab (${tabName}) error:`, err);
    return false;
  }
}

export interface SmartboardNoteRecord {
  userId: string;
  lessonId: string;
  annotations: Record<string, any>;
  updatedAt: string;
}

export async function getUserSmartboardNotes(
  userId: string,
  lessonId: string
): Promise<{ annotations: Record<string, any> | null; updatedAt: string | null }> {
  const docKey = `${sanitizeDocId(userId)}__${sanitizeDocId(lessonId)}`;

  // 1) Try Google Sheets Cloud Storage (`SmartboardNotes` tab) — Primary reliable store on Vercel
  if (hasGoogleSheetsConfig()) {
    try {
      const sheetRow = await getRowFromGoogleSheetTab('SmartboardNotes', docKey);
      if (sheetRow && sheetRow.length >= 5) {
        const updatedAt = sheetRow[3]?.toString().trim() || null;
        const unpackedJson = unpackCompressedChunks(sheetRow.slice(4));
        if (unpackedJson) {
          const parsed = JSON.parse(unpackedJson);
          memoryNotesCache.set(docKey, {
            annotationsJson: unpackedJson,
            updatedAt: updatedAt || new Date().toISOString(),
          });
          return {
            annotations: parsed,
            updatedAt,
          };
        }
      }
    } catch (sheetErr) {
      console.warn('Google Sheets getUserSmartboardNotes warning:', sheetErr);
    }
  }

  // 2) Try Firebase Firestore (`smartboard_notes` collection)
  try {
    const noteRef = doc(db, 'smartboard_notes', docKey);
    const snap = await getDoc(noteRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.annotationsJson === 'string') {
        const parsed = JSON.parse(data.annotationsJson);
        return {
          annotations: parsed,
          updatedAt: data.updatedAt || null,
        };
      }
    }
  } catch (err) {
    console.warn('Firestore getUserSmartboardNotes warning:', err);
  }

  // 3) Try Local JSON Fallback
  try {
    const localNotes = readLocalJson<Record<string, { annotationsJson: string; updatedAt: string }>>(
      LOCAL_NOTES_FILE,
      {}
    );
    if (localNotes[docKey]?.annotationsJson) {
      return {
        annotations: JSON.parse(localNotes[docKey].annotationsJson),
        updatedAt: localNotes[docKey].updatedAt || null,
      };
    }
  } catch (err) {
    console.warn('Local getUserSmartboardNotes warning:', err);
  }

  // 4) Try In-Memory Server Cache Fallback
  const mem = memoryNotesCache.get(docKey);
  if (mem?.annotationsJson) {
    try {
      return {
        annotations: JSON.parse(mem.annotationsJson),
        updatedAt: mem.updatedAt,
      };
    } catch (e) {}
  }

  return { annotations: null, updatedAt: null };
}

export async function saveUserSmartboardNotes(
  userId: string,
  lessonId: string,
  annotations: Record<string, any>
): Promise<{ ok: boolean; updatedAt: string }> {
  const docKey = `${sanitizeDocId(userId)}__${sanitizeDocId(lessonId)}`;
  const updatedAt = new Date().toISOString();
  const annotationsJson = JSON.stringify(annotations || {});
  const slideCount = Object.keys(annotations || {}).filter(
    (k) => Array.isArray(annotations[k]) && annotations[k].length > 0
  ).length;

  memoryNotesCache.set(docKey, { annotationsJson, updatedAt });

  let saved = false;

  // 1) Save to Google Sheets Cloud Storage (`SmartboardNotes` tab with zlib compression & multi-column chunking)
  if (hasGoogleSheetsConfig()) {
    try {
      const chunks = packCompressedChunks(annotationsJson);
      const rowValues = [docKey, userId.trim(), lessonId.trim(), updatedAt, ...chunks];
      const okSheet = await saveRowToGoogleSheetTab('SmartboardNotes', docKey, rowValues);
      if (okSheet) {
        saved = true;
      }
    } catch (sheetErr) {
      console.error('Google Sheets saveUserSmartboardNotes error:', sheetErr);
    }
  }

  // 2) Save to Firebase Firestore (`smartboard_notes` collection)
  try {
    const noteRef = doc(db, 'smartboard_notes', docKey);
    await setDoc(
      noteRef,
      {
        userId: userId.trim(),
        lessonId: lessonId.trim(),
        annotationsJson,
        slideCount,
        updatedAt,
      },
      { merge: true }
    );
    saved = true;
  } catch (err) {
    console.warn('Firestore saveUserSmartboardNotes warning:', err);
  }

  // 3) Save to Local JSON Fallback (only marks saved=true if fs write actually succeeds)
  try {
    const localNotes = readLocalJson<
      Record<string, { userId: string; lessonId: string; annotationsJson: string; updatedAt: string }>
    >(LOCAL_NOTES_FILE, {});
    localNotes[docKey] = {
      userId: userId.trim(),
      lessonId: lessonId.trim(),
      annotationsJson,
      updatedAt,
    };
    if (writeLocalJson(LOCAL_NOTES_FILE, localNotes)) {
      saved = true;
    }
  } catch (err) {
    console.warn('Local saveUserSmartboardNotes warning:', err);
  }

  return { ok: saved, updatedAt };
}

// ==========================================
// 3. ENGLISH PRE-TEST SCORE & TIME RECORD PER ACCOUNT
// ==========================================

export interface EnglishPretestAttemptSummary {
  attemptId: string;
  submittedAt: string;
  totalScore: number;
  totalQuestions: number;
  percentage: number;
  elapsedSeconds: number;
  partScores: {
    id: string;
    title: string;
    correct: number;
    total: number;
    percentage: number;
    timeSeconds: number;
  }[];
}

export interface EnglishPretestUserData {
  userId: string;
  userName?: string;
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  questionTimes: Record<number, number>;
  flagged: number[];
  isSubmitted: boolean;
  elapsedSeconds: number;
  latestSummary?: EnglishPretestAttemptSummary | null;
  history?: EnglishPretestAttemptSummary[];
  updatedAt: string;
}

export async function getUserEnglishPretest(
  userId: string
): Promise<EnglishPretestUserData | null> {
  const docKey = sanitizeDocId(userId);
  if (!docKey) return null;

  // 1) Try Google Sheets Cloud Storage (`EnglishPretest` tab)
  if (hasGoogleSheetsConfig()) {
    try {
      const sheetRow = await getRowFromGoogleSheetTab('EnglishPretest', docKey);
      if (sheetRow && sheetRow.length >= 5) {
        const unpackedJson = unpackCompressedChunks(sheetRow.slice(4));
        if (unpackedJson) {
          return JSON.parse(unpackedJson) as EnglishPretestUserData;
        }
      }
    } catch (sheetErr) {
      console.warn('Google Sheets getUserEnglishPretest warning:', sheetErr);
    }
  }

  // 2) Try Firebase Firestore (`english_pretest_scores` collection)
  try {
    const ref = doc(db, 'english_pretest_scores', docKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.payloadJson === 'string') {
        return JSON.parse(data.payloadJson) as EnglishPretestUserData;
      }
    }
  } catch (err) {
    console.warn('Firestore getUserEnglishPretest warning:', err);
  }

  // 3) Try Local JSON Fallback
  try {
    const localMap = readLocalJson<Record<string, EnglishPretestUserData>>(
      LOCAL_ENGLISH_PRETEST_FILE,
      {}
    );
    if (localMap[docKey]) {
      return localMap[docKey];
    }
  } catch (err) {
    console.warn('Local getUserEnglishPretest warning:', err);
  }

  return null;
}

export async function saveUserEnglishPretest(
  userId: string,
  payload: Omit<EnglishPretestUserData, 'userId' | 'updatedAt'>
): Promise<{ ok: boolean; data: EnglishPretestUserData }> {
  const docKey = sanitizeDocId(userId);
  const updatedAt = new Date().toISOString();

  // Merge history if previous record exists
  let existingHistory: EnglishPretestAttemptSummary[] = [];
  try {
    const prev = await getUserEnglishPretest(userId);
    if (prev && Array.isArray(prev.history)) {
      existingHistory = prev.history;
    }
  } catch (e) {}

  let mergedHistory = Array.isArray(payload.history) && payload.history.length > 0
    ? payload.history
    : existingHistory;

  if (payload.latestSummary) {
    const existsAlready = mergedHistory.some(
      (h) => h.attemptId === payload.latestSummary?.attemptId
    );
    if (!existsAlready) {
      mergedHistory = [payload.latestSummary, ...mergedHistory].slice(0, 20);
    }
  }

  const record: EnglishPretestUserData = {
    userId: userId.trim(),
    userName: payload.userName,
    answers: payload.answers || {},
    questionTimes: payload.questionTimes || {},
    flagged: payload.flagged || [],
    isSubmitted: Boolean(payload.isSubmitted),
    elapsedSeconds: Number(payload.elapsedSeconds) || 0,
    latestSummary: payload.latestSummary || mergedHistory[0] || null,
    history: mergedHistory,
    updatedAt,
  };

  let saved = false;
  const payloadJson = JSON.stringify(record);

  // 1) Save to Google Sheets Cloud Storage (`EnglishPretest` tab)
  if (hasGoogleSheetsConfig()) {
    try {
      const chunks = packCompressedChunks(payloadJson);
      const rowValues = [docKey, record.userId, record.userName || record.userId, updatedAt, ...chunks];
      const okSheet = await saveRowToGoogleSheetTab('EnglishPretest', docKey, rowValues);
      if (okSheet) {
        saved = true;
      }
    } catch (sheetErr) {
      console.error('Google Sheets saveUserEnglishPretest error:', sheetErr);
    }
  }

  // 2) Save to Firebase Firestore (`english_pretest_scores` collection)
  try {
    const ref = doc(db, 'english_pretest_scores', docKey);
    await setDoc(
      ref,
      {
        userId: record.userId,
        userName: record.userName || record.userId,
        isSubmitted: record.isSubmitted,
        latestScore: record.latestSummary?.totalScore ?? null,
        latestPercentage: record.latestSummary?.percentage ?? null,
        latestTimeSeconds: record.latestSummary?.elapsedSeconds ?? record.elapsedSeconds,
        payloadJson,
        updatedAt,
      },
      { merge: true }
    );
    saved = true;
  } catch (err) {
    console.warn('Firestore saveUserEnglishPretest warning:', err);
  }

  // 3) Save to Local JSON Fallback
  try {
    const localMap = readLocalJson<Record<string, EnglishPretestUserData>>(
      LOCAL_ENGLISH_PRETEST_FILE,
      {}
    );
    localMap[docKey] = record;
    if (writeLocalJson(LOCAL_ENGLISH_PRETEST_FILE, localMap)) {
      saved = true;
    }
  } catch (err) {
    console.warn('Local saveUserEnglishPretest warning:', err);
  }

  return { ok: saved, data: record };
}
