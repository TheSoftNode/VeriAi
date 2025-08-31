import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { AIController } from '@/controllers/AIController';

const router = Router();
const aiController = new AIController();

/**
 * @route POST /api/v1/ai/generate
 * @desc Generate AI content
 * @access Public
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
 * @route GET /api/v1/ai/models
 * @desc Get available AI models
 * @access Public
 */
router.get(
  '/models',
  asyncHandler(aiController.getModels)
);

/**
 * @route GET /api/v1/ai/generation/:requestId
 * @desc Get generation status and result
 * @access Public
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
 * @route POST /api/v1/ai/validate
 * @desc Validate AI output against original
 * @access Public
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
