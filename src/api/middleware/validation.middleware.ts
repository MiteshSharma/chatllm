import { NextFunction, Request, Response } from "express";
import { AnyZodObject, z } from "zod";
import { fromZodError } from "zod-validation-error";

export const validate = 
  (schema: AnyZodObject) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({
          error: {
            message: "Validation error",
            details: validationError.details
          }
        });
        return;
      }
      next(error);
    }
  }; 