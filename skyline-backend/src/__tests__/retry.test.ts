import { withExponentialBackoff } from "../utils/retry";

describe("withExponentialBackoff", () => {
  it("resolves immediately on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually resolves", async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject({ response: { status: 500 } });
      return Promise.resolve("recovered");
    });
    await expect(withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0 })).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const err = { response: { status: 503 } };
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withExponentialBackoff(fn, { retries: 2, baseDelayMs: 0 })).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable 4xx errors", async () => {
    const err = { response: { status: 400 } };
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0 })).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate-limit errors", async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject({ response: { status: 429 } });
      return Promise.resolve("done");
    });
    await expect(withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0 })).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects custom shouldRetry predicate", async () => {
    const err = new Error("custom");
    const fn = jest.fn().mockRejectedValue(err);
    await expect(
      withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0, shouldRetry: () => false })
    ).rejects.toThrow("custom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry with attempt number", async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject({ response: { status: 500 } });
      return Promise.resolve("done");
    });
    const onRetry = jest.fn();
    await withExponentialBackoff(fn, { retries: 3, baseDelayMs: 0, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.anything(), 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.anything(), 2);
  });
});
