import { Router } from 'express';
import { AIService } from '@/services/AIService';
import { VerificationService } from '@/services/VerificationService';
import { ContractService } from '@/services/ContractService';
import {
  validateEthereumAddress,
  validatePagination,
} from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const aiService = new AIService();
const verificationService = new VerificationService();

// Lazy instantiation to ensure env vars are loaded
let contractService: ContractService;
const getContractService = () => {
  if (!contractService) {
    contractService = new ContractService();
  }
  return contractService;
};

/**
 * @route   GET /api/user/:userAddress/generations
 * @desc    Get user's AI generations
 * @access  Public
 */
router.get(
  '/:userAddress/generations',
  validateEthereumAddress,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { userAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const generations = await aiService.getUserGenerations(
      userAddress,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data: generations,
    });
  })
);

/**
 * @route   GET /api/user/:userAddress/verifications
 * @desc    Get user's verifications
 * @access  Public
 */
router.get(
  '/:userAddress/verifications',
  validateEthereumAddress,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { userAddress } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const verifications = await verificationService.getUserVerifications({
      userAddress,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: verifications,
    });
  })
);

/**
 * @route   GET /api/user/:userAddress/nfts
 * @desc    Get user's NFTs
 * @access  Public
 */
router.get(
  '/:userAddress/nfts',
  validateEthereumAddress,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { userAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const nfts = await getContractService().getUserNFTs({
      userAddress,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.status(200).json({
      success: true,
      data: nfts,
    });
  })
);

/**
 * @route   GET /api/user/:userAddress/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get(
  '/:userAddress/stats',
  validateEthereumAddress,
  asyncHandler(async (req, res) => {
    const { userAddress } = req.params;

    // Get stats from all services
    const [generations, verifications, nfts] = await Promise.all([
      aiService.getUserGenerations(userAddress, 1, 1),
      verificationService.getUserVerifications({
        userAddress,
        page: 1,
        limit: 1,
      }),
      getContractService().getUserNFTs({
        userAddress,
        page: 1,
        limit: 1,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalGenerations: generations.total,
        totalVerifications: verifications.total,
        totalNFTs: nfts.total,
        lastActivity: new Date().toISOString(),
      },
    });
  })
);

export default router;
