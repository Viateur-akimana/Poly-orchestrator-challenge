/**
 * Integration tests — /api/public routes
 *
 * Covers: GET /api/public/exchange-rate, GET /api/public/bank-details.
 * All external service calls and database queries are mocked.
 */

// ── env vars ──────────────────────────────────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.JWT_SECRET = "test-jwt-secret-for-integration-tests";

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock("../../middleware/rate-limit.middleware", () => ({
  rateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  strictLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  transferLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock("../../lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    user: { findUnique: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
    systemSettings: { findFirst: jest.fn() },
  },
}));

jest.mock("../../services", () => ({
  emailService: { sendEmail: jest.fn(), sendWelcomeEmail: jest.fn() },
  auditService: { log: jest.fn(), logLogin: jest.fn() },
  backgroundJobsService: { start: jest.fn(), stop: jest.fn() },
  AuditAction: {},
}));

const mockExchangeRateService = {
  calculateRate: jest.fn(),
  calculateReverseRate: jest.fn(),
};

jest.mock("../../services/service-container", () => ({
  ServiceContainer: {
    get exchangeRateService() {
      return mockExchangeRateService;
    },
    cleanup: jest.fn(),
  },
}));

// ── imports after mocks ───────────────────────────────────────────────────────

import request from "supertest";
import { createTestApp } from "../helpers/app";
import { prisma } from "../../lib/prisma";

const app = createTestApp();

// ── helpers ───────────────────────────────────────────────────────────────────

const mockRateResult = {
  sendAmount: 1000,
  receiveAmount: 12500,
  rate: 12.5,
  commission: 0,
  totalAmount: 1000,
  lastUpdated: new Date().toISOString(),
};

const mockSettings = {
  id: "sys-001",
  cardNumber: "4111 1111 1111 1111",
  cardHolderName: "SKYLINE TRANSFERS",
  rwandaMobileMoney: "+250788000000",
  rwandaRecipientName: "Skyline RWF",
};

// ── test suites ───────────────────────────────────────────────────────────────

describe("GET /api/public/exchange-rate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with rate data for a valid amount", async () => {
    mockExchangeRateService.calculateRate.mockResolvedValue(mockRateResult);

    const res = await request(app)
      .get("/api/public/exchange-rate")
      .query({ amount: "1000", from: "RUB", to: "RWF" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sendAmount).toBe(1000);
    expect(res.body.data.fromCurrency).toBe("RUB");
    expect(res.body.data.toCurrency).toBe("RWF");
  });

  it("uses default amount of 1000 when none is supplied", async () => {
    mockExchangeRateService.calculateRate.mockResolvedValue(mockRateResult);

    const res = await request(app).get("/api/public/exchange-rate");

    expect(res.status).toBe(200);
    expect(mockExchangeRateService.calculateRate).toHaveBeenCalledWith(1000);
  });

  it("returns 400 when amount is zero or negative", async () => {
    const res = await request(app)
      .get("/api/public/exchange-rate")
      .query({ amount: "0" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("calls calculateReverseRate for RWF→RUB direction", async () => {
    mockExchangeRateService.calculateReverseRate.mockResolvedValue(
      mockRateResult
    );

    const res = await request(app)
      .get("/api/public/exchange-rate")
      .query({ amount: "500", from: "RWF", to: "RUB" });

    expect(res.status).toBe(200);
    expect(mockExchangeRateService.calculateReverseRate).toHaveBeenCalledWith(
      500
    );
  });

  it("returns 500 when the exchange rate service throws", async () => {
    mockExchangeRateService.calculateRate.mockRejectedValue(
      new Error("external API timeout")
    );

    const res = await request(app)
      .get("/api/public/exchange-rate")
      .query({ amount: "1000" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/public/bank-details", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with bank details when configured", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(
      mockSettings
    );

    const res = await request(app).get("/api/public/bank-details");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cardNumber).toBe(mockSettings.cardNumber);
    expect(res.body.data.cardHolder).toBe(mockSettings.cardHolderName);
  });

  it("returns 404 when bank details have not been configured", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/public/bank-details");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when the database query fails", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockRejectedValue(
      new Error("db error")
    );

    const res = await request(app).get("/api/public/bank-details");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
