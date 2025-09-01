import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { AIController } from '@/controllers/AIController';

const router = Router();
const aiController = new AIController();

/**
 * @swagger
 * /api/v1/ai/generate:
 *   post:
 *     summary: Generate AI content
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIGeneration'
 *     responses:
 *       201:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/generate',
  [
    body('prompt')
      .isString()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Prompt must be between 1 and 2000 characters'),
    body('model')
      .isString()
      .isIn(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-3-haiku'])
      .withMessage('Invalid AI model'),
    body('userAddress')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    body('maxTokens')
      .optional()
      .isInt({ min: 1, max: 4000 })
      .withMessage('Max tokens must be between 1 and 4000'),
    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
  ],
  validateRequest,
  asyncHandler(aiController.generateContent)
);

/**
 * @swagger
 * /api/v1/ai/models:
 *   get:
 *     summary: Get available AI models
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: List of available AI models
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/models',
  asyncHandler(aiController.getModels)
);

/**
 * @swagger
 * /api/v1/ai/generation/{requestId}:
 *   get:
 *     summary: Get generation status and result
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Generation request ID
 *     responses:
 *       200:
 *         description: Generation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Generation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/generation/:requestId',
  [
    param('requestId')
      .isUUID()
      .withMessage('Invalid request ID format'),
  ],
  validateRequest,
  asyncHandler(aiController.getGeneration)
);

/**
 * @swagger
 * /api/v1/ai/validate:
 *   post:
 *     summary: Validate AI output against original
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt, output, model, expectedHash]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: 'Write a poem about AI'
 *               output:
 *                 type: string
 *                 example: 'AI brings us...' 
 *               model:
 *                 type: string
 *                 example: 'gpt-4'
 *               expectedHash:
 *                 type: string
 *                 example: 'abc123def456'
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/validate',
  [
    body('prompt').isString().notEmpty(),
    body('output').isString().notEmpty(),
    body('model').isString().notEmpty(),
    body('expectedHash').isString().isLength({ min: 64, max: 66 }),
  ],
  validateRequest,
  asyncHandler(aiController.validateOutput)
);

export default router;
