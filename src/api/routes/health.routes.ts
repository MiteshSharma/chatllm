import { Router } from "express";

export function registerHealthRoutes(router: Router): void {
  /**
   * @swagger
   * /api/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Check API health
   *     description: Returns health status of the API
   *     responses:
   *       200:
   *         description: API is healthy
   */
  router.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
} 