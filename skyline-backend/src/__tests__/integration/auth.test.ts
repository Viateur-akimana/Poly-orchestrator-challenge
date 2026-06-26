/**
 * Integration tests — /api/auth routes
 *
 * Covers: register, login, GET /me, logout.
 * Prisma, Redis, email and audit services are all mocked so no real
 * infrastructure is needed.
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
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    systemSettings: { findFirst: jest.fn() },
  },
}));

jest.mock("../../services", () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
  auditService: {
    log: jest.fn().mockResolvedValue(undefined),
    logLogin: jest.fn().mockResolvedValue(undefined),
  },
  backgroundJobsService: { start: jest.fn(), stop: jest.fn() },
  AuditAction: { LOGIN: "LOGIN", LOGOUT: "LOGOUT", REGISTER: "REGISTER" },
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
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createTestApp } from "../helpers/app";
import { prisma } from "../../lib/prisma";

const app = createTestApp();

// ── helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = "test-jwt-secret-for-integration-tests";

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-test-001",
    email: "test@example.com",
    password: bcrypt.hashSync("Password123", 10),
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+250788000000",
    role: "USER",
    status: "ACTIVE",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeToken(
  payload: Record<string, unknown> = {},
  secret = JWT_SECRET
) {
  return jwt.sign(
    {
      userId: "user-test-001",
      email: "test@example.com",
      role: "USER",
      ...payload,
    },
    secret,
    { expiresIn: "1h" }
  );
}

// ── test suites ───────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  const validPayload = {
    email: "newuser@example.com",
    password: "Password123",
    firstName: "New",
    lastName: "User",
  };

  it("returns 201 and an access token on success", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(
      makeUser({ email: "newuser@example.com" })
    );

    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 400 when email is already taken", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "missing@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid Rwanda phone number", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, phoneNumber: "+1800INVALID" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 and an access token for valid credentials", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 401 when the password is wrong", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "WrongPass999" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when the user does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when the account is inactive", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ status: "INACTIVE" })
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "Password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when the request body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });

  it("returns 401 with a token signed by the wrong secret", async () => {
    const badToken = makeToken({}, "wrong-secret");

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${badToken}`);

    expect(res.status).toBe(401);
  });

  it("returns 200 with user data for a valid token", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    const token = makeToken();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });

  it("returns 200 when authenticated", async () => {
    const token = makeToken();

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
