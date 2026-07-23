export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError, sanitizeString } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

interface UserRow {
  id: string; email: string; name: string; role: string; plan: string;
  avatar_initials: string; tenant_id: string; tenant_name: string;
  created_at: string; last_login_at: string | null;
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    avatarInitials: row.avatar_initials,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

const SELECT_USER = `
  SELECT id, email, name, role, plan, avatar_initials, tenant_id, tenant_name, created_at, last_login_at
  FROM users WHERE id = ?
`;

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    let row = await (await db.prepare(SELECT_USER)).get(user.id) as UserRow | undefined;

    if (!row) {
      // Auto-create user record if missing (e.g. in-memory DB after restart)
      const initials = (user.name || "U").split(" ").filter(Boolean).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
      await (await db.prepare(
        "INSERT OR IGNORE INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials) VALUES (?, ?, ?, '', ?, ?, ?, ?, ?)"
      )).run(user.id, user.email, user.name, user.role || "advertiser", user.tenantId, user.tenantName || "Organization", user.plan || "growth", initials);
      row = await (await db.prepare(SELECT_USER)).get(user.id) as UserRow | undefined;
    }

    if (!row) return jsonError("User not found", 404);

    return json({ data: mapUser(row) });
  } catch (error) {
    logger.error("settings/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load settings", 500);
  }
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json() as Record<string, unknown>;
    const name = body.name !== undefined ? sanitizeString(String(body.name), 200) : undefined;
    const plan = body.plan !== undefined ? sanitizeString(String(body.plan), 50) : undefined;

    if (name !== undefined && name.length === 0) {
      return jsonError("Name cannot be empty", 400);
    }
    if (plan !== undefined && !["starter", "growth", "scale", "enterprise"].includes(plan)) {
      return jsonError("Invalid plan. Must be: starter, growth, scale, or enterprise", 400);
    }

    const db = await getDb();

    if (name !== undefined) {
      const initials = name
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
        || "U";

      await (await db.prepare("UPDATE users SET name = ?, avatar_initials = ? WHERE id = ?")).run(name, initials, user.id);
    }

    if (plan !== undefined) {
      await (await db.prepare("UPDATE users SET plan = ? WHERE id = ?")).run(plan, user.id);
    }

    const updated = await (await db.prepare(SELECT_USER)).get(user.id) as UserRow;

    return json({ data: mapUser(updated) });
  } catch (error) {
    return handleApiError(error, "settings/PUT failed");
  }
}
