import { Router } from 'express';
import { ContractController } from '@/controllers/ContractController';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  validateFDCAttestationSubmission,
  validateAttestationVerification,
} from '@/middleware/validation';

const router = Router();

// Lazy instantiation to ensure env vars are loaded
let contractController: ContractController;
const getController = () => {
  if (!contractController) {
    contractController = new ContractController();
  }
  return contractController;
};

/**
 * @route   POST /api/fdc/attestation
 * @desc    Submit FDC attestation
 * @access  Public
 */
router.post(
  '/attestation',
  validateFDCAttestationSubmission,
  asyncHandler(async (req, res) => getController().submitAttestation(req, res))
);

/**
 * @route   POST /api/fdc/verify
 * @desc    Verify FDC attestation
 * @access  Public
 */
router.post(
  '/verify',
  validateAttestationVerification,
  asyncHandler(async (req, res) => {
    // This would typically be handled by VerificationController
    // but keeping it here for FDC-specific verification
    res.status(501).json({
      success: false,
      message: 'FDC verification endpoint not yet implemented',
    });
  })
);

/**
 * @route   GET /api/fdc/stats
 * @desc    Get FDC network statistics
 * @access  Public
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    // This would integrate with FDCService
    res.status(200).json({
      success: true,
      data: {
        totalAttestations: 0,
        confirmedAttestations: 0,
        averageConfirmationTime: 0,
        networkHealth: 'unknown',
      },
    });
  })
);

export default router;
