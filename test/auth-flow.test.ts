import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, createSession, verifyToken, validateEmail } from "@/lib/auth";
import { loginSchema, signupSchema, emailSchema, passwordSchema, nameSchema } from "@/lib/validation";

describe("auth — password hashing", () => {
  it("hashPassword produces a salt:hash string", () => {
    const hash = hashPassword("password123!");
    expect(hash).toContain(":");
    expect(hash.split(":")[0].length).toBe(32);
    expect(hash.split(":")[1].length).toBe(128);
  });

  it("verifyPassword matches correct password", () => {
    const hash = hashPassword("secureP@ss1");
    expect(verifyPassword("secureP@ss1", hash)).toBe(true);
  });

  it("verifyPassword rejects wrong password", () => {
    const hash = hashPassword("secureP@ss1");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("verifyPassword rejects malformed stored hash", () => {
    expect(verifyPassword("pwd", "invalid")).toBe(false);
    expect(verifyPassword("pwd", "onlysalt:")).toBe(false);
  });
});

describe("auth — JWT sessions", () => {
  const user = {
    id: "usr_test1", email: "test@kiki.ai", name: "Test User",
    role: "advertiser", tenantId: "tnt_test1", tenantName: "Test Org",
    plan: "growth", avatarInitials: "TU",
  };

  it("createSession produces a 3-part JWT", () => {
    const token = createSession(user);
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyToken returns payload for valid token", () => {
    const token = createSession(user);
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe(user.id);
    expect(payload?.email).toBe(user.email);
    expect(payload?.tenantId).toBe(user.tenantId);
  });

  it("verifyToken returns null for tampered token", () => {
    const token = createSession(user);
    const parts = token.split(".");
    parts[2] = "invalidsignature";
    expect(verifyToken(parts.join("."))).toBeNull();
  });
});

describe("auth — input validation (Zod schemas)", () => {
  it("signupSchema rejects short password", () => {
    const result = signupSchema.safeParse({ email: "a@b.com", password: "short", name: "Test" });
    expect(result.success).toBe(false);
  });

  it("signupSchema rejects invalid email", () => {
    const result = signupSchema.safeParse({ email: "notanemail", password: "longenough123!", name: "Test" });
    expect(result.success).toBe(false);
  });

  it("signupSchema rejects short name", () => {
    const result = signupSchema.safeParse({ email: "a@b.com", password: "longenough123!", name: "X" });
    expect(result.success).toBe(false);
  });

  it("signupSchema parses valid input", () => {
    const result = signupSchema.safeParse({ email: "Test@Example.COM", password: "secureP@ss1", name: "Test User" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
      expect(result.data.name).toBe("Test User");
    }
  });

  it("loginSchema requires both email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "pwd" }).success).toBe(false);
    expect(loginSchema.safeParse({}).success).toBe(false);
  });

  it("loginSchema parses valid login", () => {
    const result = loginSchema.safeParse({ email: "A@B.COM", password: "password123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("a@b.com");
    }
  });
});

describe("auth — email validation", () => {
  it("validateEmail accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("a.b@c.co")).toBe(true);
    expect(validateEmail("test+tag@domain.org")).toBe(true);
  });

  it("validateEmail rejects invalid emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });
});
