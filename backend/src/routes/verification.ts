import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { VerificationController } from '@/controllers/VerificationController';
import { VerificationService } from '@/services/VerificationService';

const router = Router();
const verificationController = new VerificationController();
const verificationService = new VerificationService();

/**
 * @route POST /api/v1/verification/request
 * @desc Request verification for AI content
 * @access Public
 */
router.post(
  '/request',
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
    body('output')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Output must be between 1 and 10000 characters'),
  ],
  validateRequest,
  asyncHandler(verificationController.submitProof)
);

/**
 * @route GET /api/v1/verification/:requestId
 * @desc Get verification status and details
 * @access Public
 */
router.get(
  '/:requestId',
  [
    param('requestId')
      .isString()
      .isLength({ min: 64, max: 66 })
      .withMessage('Invalid request ID format'),
  ],
  validateRequest,
  asyncHandler(verificationController.getVerification)
);

/**
 * @route POST /api/v1/verification/:requestId/fulfill
 * @desc Fulfill verification with FDC attestation
 * @access Private (FDC Relayer only)
 */
router.post(
  '/:requestId/fulfill',
  [
    param('requestId')
      .isString()
      .isLength({ min: 64, max: 66 })
      .withMessage('Invalid request ID format'),
    body('fdcAttestationId')
      .isString()
      .isLength({ min: 64, max: 66 })
      .withMessage('Invalid FDC attestation ID'),
    body('proof')
      .isArray()
      .withMessage('Proof must be an array'),
    body('verified')
      .isBoolean()
      .withMessage('Verified must be a boolean'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    // TODO: Implement verification fulfillment
    res.status(501).json({
      success: false,
      message: 'Verification fulfillment not yet implemented',
    });
  })
);

/**
 * @route GET /api/v1/verification/user/:address
 * @desc Get user's verification history
 * @access Public
 */
router.get(
  '/user/:address',
  [
    param('address')
      .isEthereumAddress()
      .withMessage('Invalid Ethereum address'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'processing', 'completed', 'failed'])
      .withMessage('Invalid status filter'),
  ],
  validateRequest,
  asyncHandler(verificationController.getUserVerifications)
);

/**
 * @route POST /api/v1/verification/:requestId/retry
 * @desc Retry failed verification
 * @access Public
 */
router.post(
  '/:requestId/retry',
  [
    param('requestId')
      .isString()
      .isLength({ min: 64, max: 66 })
      .withMessage('Invalid request ID format'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    // TODO: Implement verification retry
    res.status(501).json({
      success: false,
      message: 'Verification retry not yet implemented',
    });
  })
);

/**
 * @route GET /api/v1/verification/stats
 * @desc Get verification statistics
 * @access Public
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await verificationService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  })
);

export default router;
