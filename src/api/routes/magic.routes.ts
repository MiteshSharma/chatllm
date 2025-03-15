import { Router } from "express";

export function registerMagicRoutes(router: Router): void {
  /**
   * @swagger
   * /api/magic/number:
   *   get:
   *     summary: Get a magic number (pi)
   *     tags:
   *       - Magic
   *     responses:
   *       200:
   *         description: Returns the magic number
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 magic:
   *                   type: number
   *                   description: The magic number (pi)
   *                   example: 3.14159
   */
  router.get("/magic/number", (req, res) => {
    res.json({ magic:  Math.PI });
  });

  /**
   * @swagger
   * /api/magic/string:
   *   get:
   *     summary: Convert a magic number to a friendly string
   *     tags:
   *       - Magic
   *     parameters:
   *       - in: query
   *         name: number
   *         schema:
   *           type: number
   *         required: true
   *         description: The magic number to convert
   *     responses:
   *       200:
   *         description: Returns a friendly string with the magic number
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: string
   *                   description: A friendly string including the magic number
   *                   example: I like 42
   *       400:
   *         description: Invalid input parameter
   */
  router.get("/magic/string", (req, res) => {
    const number = req.query.number;
    
    if (!number || isNaN(Number(number))) {
      return res.status(400).json({ error: "Please provide a valid number" });
    }
    
    res.json({ result: `I like ${number}` });
  });
} 