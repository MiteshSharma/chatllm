import { NextFunction, Request, Response } from "express";
import { Logger } from "../../utils/logger";

// List of common browser identifiers
const BROWSER_IDENTIFIERS = [
  "Chrome",
  "Firefox",
  "Safari",
  "Edge",
  "Opera",
  "MSIE",
  "Trident",
  "Mozilla",
  "Edg",
  "Brave",
];

interface BrowserCheckOptions {
  allowMissingUserAgent?: boolean;
  allowUnknownBrowsers?: boolean;
  logger: Logger;
}

export function browserCheckMiddleware(options: BrowserCheckOptions) {
  const { 
    allowMissingUserAgent = false, 
    allowUnknownBrowsers = false,
    logger
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const userAgent = req.headers["user-agent"];

    // Check if User-Agent is missing
    if (!userAgent) {
      logger.warn("Request without User-Agent header", {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      if (!allowMissingUserAgent) {
        res.status(403).json({
          error: {
            code: "MISSING_USER_AGENT",
            message: "User-Agent header is required",
          },
        });
      }
    } 
    
    // Check if User-Agent matches any known browser
    else if (!BROWSER_IDENTIFIERS.some(id => userAgent.includes(id))) {
      logger.warn("Request with unrecognized User-Agent", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent,
      });
      if (!allowUnknownBrowsers) {
        res.status(403).json({
          error: {
            code: "UNRECOGNIZED_USER_AGENT",
            message: "Access is only allowed from recognized browsers",
          },
        });
      }
    }

    next();
  };
} 