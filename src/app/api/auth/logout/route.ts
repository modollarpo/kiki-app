import { json } from "@/lib/auth";

export function POST() {
  // Stateless logout — client clears token.
  // In production, you'd revoke the token server-side (e.g., Redis blacklist).
  return json({ ok: true });
}
