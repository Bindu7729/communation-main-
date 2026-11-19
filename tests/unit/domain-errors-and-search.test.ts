import { describe, it, expect } from "vitest";
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  isAppError,
} from "@/lib/domain/errors";
import { escapeIlike } from "@/lib/domain/search";

describe("Domain Errors", () => {
  it("creates custom AppError with correct code, message, and status", () => {
    const err = new AppError("custom_code", "Custom error message", 418);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("custom_code");
    expect(err.message).toBe("Custom error message");
    expect(err.status).toBe(418);
    expect(err.name).toBe("AppError");
  });

  it("creates AuthenticationError with 401 status", () => {
    const err = new AuthenticationError();
    expect(err.code).toBe("authentication");
    expect(err.message).toBe("Unauthorized");
    expect(err.status).toBe(401);

    const custom = new AuthenticationError("Token expired");
    expect(custom.message).toBe("Token expired");
  });

  it("creates AuthorizationError with 403 status", () => {
    const err = new AuthorizationError();
    expect(err.code).toBe("authorization");
    expect(err.message).toBe("Forbidden");
    expect(err.status).toBe(403);
  });

  it("creates ValidationError with 400 status", () => {
    const err = new ValidationError("Email is invalid");
    expect(err.code).toBe("validation");
    expect(err.message).toBe("Email is invalid");
    expect(err.status).toBe(400);
  });

  it("creates NotFoundError with 404 status", () => {
    const err = new NotFoundError();
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
  });

  it("creates ConflictError with 409 status", () => {
    const err = new ConflictError();
    expect(err.code).toBe("conflict");
    expect(err.message).toBe("Already exists");
    expect(err.status).toBe(409);
  });

  it("creates RateLimitError with 429 status", () => {
    const err = new RateLimitError();
    expect(err.code).toBe("rate_limit");
    expect(err.message).toBe("Too many requests");
    expect(err.status).toBe(429);
  });

  it("creates InternalError with 500 status", () => {
    const err = new InternalError();
    expect(err.code).toBe("internal");
    expect(err.message).toBe("Something went wrong");
    expect(err.status).toBe(500);
  });

  it("identifies AppError instances with isAppError type guard", () => {
    expect(isAppError(new ValidationError("bad input"))).toBe(true);
    expect(isAppError(new AuthenticationError())).toBe(true);
    expect(isAppError(new Error("standard error"))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({ message: "error" })).toBe(false);
    expect(isAppError("string error")).toBe(false);
  });
});

describe("Domain Search - escapeIlike", () => {
  it("escapes percent wildcards", () => {
    expect(escapeIlike("100% discount")).toBe("100\\% discount");
  });

  it("escapes underscore wildcards", () => {
    expect(escapeIlike("user_name")).toBe("user\\_name");
  });

  it("escapes backslashes", () => {
    expect(escapeIlike("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("escapes combinations of wildcards", () => {
    expect(escapeIlike("%admin_secret\\key%")).toBe("\\%admin\\_secret\\\\key\\%");
  });

  it("leaves standard characters intact", () => {
    expect(escapeIlike("Hello World 123 - . @")).toBe("Hello World 123 - . @");
  });
});
