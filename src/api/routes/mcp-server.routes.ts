import { Router } from 'express';
import { MCPServerController } from '../controllers/mcp-server.controller';

export function registerMCPServerRoutes(router: Router): void {
  const controller = new MCPServerController();

  /**
   * @swagger
   * /api/mcp-servers:
   *   get:
   *     summary: Get all MCP servers
   *     tags:
   *       - MCP Servers
   *     responses:
   *       200:
   *         description: Returns all MCP servers
   */
  router.get("/mcp-servers", (req, res) => controller.getAllServers(req, res));

  /**
   * @swagger
   * /api/mcp-servers/{id}:
   *   get:
   *     summary: Get MCP server by ID
   *     tags:
   *       - MCP Servers
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the MCP server
   *       404:
   *         description: Server not found
   */
  router.get("/mcp-servers/:id", (req, res) => controller.getServerById(req, res));

  /**
   * @swagger
   * /api/mcp-servers:
   *   post:
   *     summary: Create new MCP server
   *     tags:
   *       - MCP Servers
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       201:
   *         description: Server created
   *       400:
   *         description: Invalid input
   */
  router.post("/mcp-servers", (req, res) => controller.createServer(req, res));

  /**
   * @swagger
   * /api/mcp-servers/{id}:
   *   put:
   *     summary: Update MCP server
   *     tags:
   *       - MCP Servers
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Server updated
   *       404:
   *         description: Server not found
   */
  router.put("/mcp-servers/:id", (req, res) => controller.updateServer(req, res));

  /**
   * @swagger
   * /api/mcp-servers/{id}:
   *   delete:
   *     summary: Delete MCP server
   *     tags:
   *       - MCP Servers
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Server deleted
   *       404:
   *         description: Server not found
   */
  router.delete("/mcp-servers/:id", (req, res) => controller.deleteServer(req, res));
}

// For backwards compatibility
const router = Router();
const controller = new MCPServerController();

router.get('/', (req, res) => controller.getAllServers(req, res));
router.get('/:id', (req, res) => controller.getServerById(req, res));
router.post('/', (req, res) => controller.createServer(req, res));
router.put('/:id', (req, res) => controller.updateServer(req, res));
router.delete('/:id', (req, res) => controller.deleteServer(req, res));

export default router; 