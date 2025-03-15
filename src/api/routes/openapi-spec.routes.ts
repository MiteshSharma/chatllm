import { Router } from "express";
import { OpenAPISpecController } from "../controllers/openapi-spec.controller";

export function registerOpenAPISpecRoutes(router: Router): void {
  const openAPISpecController = new OpenAPISpecController();

  /**
   * @swagger
   * /api/openapi-specs:
   *   get:
   *     summary: Get all OpenAPI specifications
   *     tags:
   *       - OpenAPI
   *     responses:
   *       200:
   *         description: List of OpenAPI specifications
   */
  router.get("/openapi-specs", openAPISpecController.getAllSpecs.bind(openAPISpecController));

  /**
   * @swagger
   * /api/openapi-specs/{id}:
   *   get:
   *     summary: Get an OpenAPI specification by ID
   *     tags:
   *       - OpenAPI
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: OpenAPI specification
   *       404:
   *         description: Specification not found
   */
  router.get("/openapi-specs/:id", openAPISpecController.getSpecById.bind(openAPISpecController));

  /**
   * @swagger
   * /api/openapi-specs:
   *   post:
   *     summary: Create a new OpenAPI specification
   *     tags:
   *       - OpenAPI
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - specContent
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               specContent:
   *                 type: string
   *               authConfig:
   *                 type: object
   *               isEnabled:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Specification created
   *       400:
   *         description: Invalid input
   */
  router.post("/openapi-specs", openAPISpecController.createSpec.bind(openAPISpecController));

  /**
   * @swagger
   * /api/openapi-specs/{id}:
   *   put:
   *     summary: Update an OpenAPI specification
   *     tags:
   *       - OpenAPI
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
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               specContent:
   *                 type: string
   *               authConfig:
   *                 type: object
   *               isEnabled:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Specification updated
   *       404:
   *         description: Specification not found
   */
  router.put("/openapi-specs/:id", openAPISpecController.updateSpec.bind(openAPISpecController));

  /**
   * @swagger
   * /api/openapi-specs/{id}:
   *   delete:
   *     summary: Delete an OpenAPI specification
   *     tags:
   *       - OpenAPI
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Specification deleted
   *       404:
   *         description: Specification not found
   */
  router.delete("/openapi-specs/:id", openAPISpecController.deleteSpec.bind(openAPISpecController));

  /**
   * @swagger
   * /api/openapi-specs/{id}/reload:
   *   post:
   *     summary: Reload an OpenAPI specification
   *     tags:
   *       - OpenAPI
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Specification reloaded
   *       404:
   *         description: Specification not found
   */
  router.post("/openapi-specs/:id/reload", openAPISpecController.reloadSpec.bind(openAPISpecController));
} 