import crypto from "crypto";
import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";

export function generateSecret(): string {
  return otpGenerateSecret();
}

export function buildOtpauthUri(email: string, secret: string): string {
  return generateURI({ issuer: "KIKI", label: email, secret });
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token: token.replace(/\s/g, ""), secret });
    return result.valid === true;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .digest("hex");
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode);
}

export function verifyAndConsumeBackupCode(
  code: string,
  storedJson: string | null
): { valid: boolean; remaining: string[] } {
  if (!storedJson) return { valid: false, remaining: [] };
  let hashes: string[] = [];
  try {
    hashes = JSON.parse(storedJson);
  } catch {
    return { valid: false, remaining: [] };
  }
  if (!Array.isArray(hashes)) return { valid: false, remaining: [] };
  const idx = hashes.indexOf(hashBackupCode(code));
  if (idx === -1) return { valid: false, remaining: hashes };
  const remaining = [...hashes];
  remaining.splice(idx, 1);
  return { valid: true, remaining };
}
