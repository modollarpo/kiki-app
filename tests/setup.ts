// Test setup — runs before all tests

// Set required env vars for testing
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only-32chars!!";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = ":memory:";

// Suppress console.log during tests (uncomment if noisy)
// globalThis.console.log = () => {};
