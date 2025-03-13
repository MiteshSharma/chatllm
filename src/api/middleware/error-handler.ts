import { NextFunction, Request, Response } from "express";

import { ApplicationError } from "../../domain/errors/application-error";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  if (err instanceof ApplicationError) {
    // Handle known application errors
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        details: err.details,
        message: err.message,
      },
    });
    return;
  }

  // Handle unknown errors
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
