// Base application error class
export class ApplicationError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", details);
  }
}
