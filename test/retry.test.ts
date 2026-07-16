import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "@/lib/retry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { baseDelayMs: 10, maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 3 });
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after maxRetries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 2 });
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry on non-retryable error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bad request"));

    await expect(
      withRetry(fn, { baseDelayMs: 10, maxRetries: 3 })
    ).rejects.toThrow("bad request");

    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries on 429 error", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("429 rate limit"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 3 });
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 error", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("503 service unavailable"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 3 });
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses custom retryOn function", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("custom error"));
    const retryOn = vi.fn().mockReturnValue(true);

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 1, retryOn });
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(20);

    await expect(promise).rejects.toThrow("custom error");
    expect(retryOn).toHaveBeenCalled();
  });

  it("stops retrying when retryOn returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permanent failure"));
    const retryOn = vi.fn().mockReturnValue(false);

    await expect(
      withRetry(fn, { baseDelayMs: 10, maxRetries: 3, retryOn })
    ).rejects.toThrow("permanent failure");

    expect(fn).toHaveBeenCalledOnce();
  });
});
