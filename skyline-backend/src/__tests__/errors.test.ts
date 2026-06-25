import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
} from "../lib/errors";

describe("AppError", () => {
  it("sets message, statusCode, and code", () => {
    const err = new AppError("something broke", 500, "INTERNAL_ERROR");
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.isOperational).toBe(true);
  });

  it("is an instance of Error", () => {
    expect(new AppError("x")).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("has status 400 and VALIDATION_ERROR code", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("NotFoundError", () => {
  it("has status 404 and NOT_FOUND code", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("uses custom message", () => {
    expect(new NotFoundError("user not found").message).toBe("user not found");
  });
});

describe("UnauthorizedError", () => {
  it("has status 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });
});

describe("ForbiddenError", () => {
  it("has status 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });
});

describe("ConflictError", () => {
  it("has status 409", () => {
    expect(new ConflictError("already exists").statusCode).toBe(409);
  });
});

describe("ExternalServiceError", () => {
  it("prefixes the service name", () => {
    const err = new ExternalServiceError("UnitPay", "timeout");
    expect(err.message).toBe("UnitPay: timeout");
    expect(err.statusCode).toBe(502);
  });
});

describe("RateLimitError", () => {
  it("has status 429", () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });
});
