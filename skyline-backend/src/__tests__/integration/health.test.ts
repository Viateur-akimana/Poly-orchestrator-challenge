/**
 * Integration tests — GET /health
 */

// ── env vars must be set before any module that reads them is imported ────────
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.JWT_SECRET = "test-jwt-secret-for-integration-tests";

// ── module mocks (hoisted by jest) ────────────────────────────────────────────

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

jest.mock("../../services/service-container", () => ({
  ServiceContainer: {
    exchangeRateService: {
      calculateRate: jest.fn(),
      calculateReverseRate: jest.fn(),
    },
    cleanup: jest.fn(),
  },
}));

// ── imports after mocks ───────────────────────────────────────────────────────

import request from "supertest";
import { createTestApp } from "../helpers/app";
import { prisma } from "../../lib/prisma";

const app = createTestApp();

// ── tests ─────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with status ok when database is reachable", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });

  it("returns 503 with status degraded when database is unreachable", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error("connection refused")
    );

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.database).toBe("disconnected");
  });
});

describe("GET /unknown-route", () => {
  it("returns 404 for unregistered paths", async () => {
    const res = await request(app).get("/this/does/not/exist");
    expect(res.status).toBe(404);
  });
});
