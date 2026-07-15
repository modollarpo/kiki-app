import { describe, it, expect, beforeEach } from "vitest";

describe("Authentication", () => {
  it("should hash and verify passwords correctly", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth");
    const password = "test-password-123";
    const hashed = hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed).toContain(":");
    expect(verifyPassword(password, hashed)).toBe(true);
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });

  it("should create and verify JWT tokens", async () => {
    const { createSession, verifyToken } = await import("@/lib/auth");
    const user = {
      id: "u1",
      email: "test@example.com",
      name: "Test User",
      role: "advertiser" as const,
      tenantId: "t1",
      tenantName: "Test Corp",
      plan: "growth" as const,
      avatarInitials: "TU",
    };

    const token = createSession(user);
    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);

    const payload = verifyToken(token);
    expect(payload).toBeTruthy();
    expect(payload!.userId).toBe("u1");
    expect(payload!.email).toBe("test@example.com");
    expect(payload!.tenantId).toBe("t1");
  });

  it("should reject invalid tokens", async () => {
    const { verifyToken } = await import("@/lib/auth");
    expect(verifyToken("invalid-token")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});
