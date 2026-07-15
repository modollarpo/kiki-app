import { getDb, genId } from "@/lib/db";
import { json, jsonError, validateEmail, validateRequired, sanitizeString, getUserFromRequest } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, company, message } = body;

    const missing = validateRequired({ firstName, lastName, email, company, message });
    if (missing) return jsonError(missing);

    if (typeof email !== "string" || !validateEmail(email)) return jsonError("Invalid email");
    if (firstName.length > 100) return jsonError("First name too long");
    if (lastName.length > 100) return jsonError("Last name too long");
    if (company.length > 200) return jsonError("Company name too long");
    if (message.length > 5000) return jsonError("Message too long");

    const db = await getDb();
    const id = genId("ctc");
    await db.prepare(`
      INSERT INTO contacts (id, first_name, last_name, email, company, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `).run(id, sanitizeString(firstName, 100), sanitizeString(lastName, 100),
      email.toLowerCase().trim(), sanitizeString(company, 200), sanitizeString(message, 5000));

    return json({ ok: true, id }, 201);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Unauthorized", 401);

    const db = await getDb();
    const contacts = await db.prepare("SELECT * FROM contacts ORDER BY created_at DESC").all();
    return json({ contacts, total: contacts.length });
  } catch {
    return jsonError("Failed to fetch contacts", 500);
  }
}
