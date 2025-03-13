import { Router } from "express";
import { MessageController } from "../controllers/message.controller";

export function registerMessageRoutes(router: Router): void {
  const messageController = new MessageController();

  /**
   * @swagger
   * /api/messages:
   *   post:
   *     tags:
   *       - Messages
   *     summary: Process a new message
   *     description: Sends a message to be processed by an AI model
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/MessageRequest'
   *     responses:
   *       200:
   *         description: Message processed successfully
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  router.post("/messages", messageController.processMessage.bind(messageController));
}
