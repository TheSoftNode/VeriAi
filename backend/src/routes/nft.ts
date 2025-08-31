import { Router } from 'express';
import { ContractController } from '@/controllers/ContractController';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  validateNFTMinting,
  validateTokenId,
  validateEthereumAddress,
  validatePagination,
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
 * @route   POST /api/nft/mint
 * @desc    Mint NFT for verified AI output
 * @access  Public
 */
router.post(
  '/mint',
  validateNFTMinting,
  asyncHandler(async (req, res) => getController().mintNFT(req, res))
);

/**
 * @route   GET /api/nft/:tokenId
 * @desc    Get NFT details by token ID
 * @access  Public
 */
router.get(
  '/:tokenId',
  validateTokenId,
  asyncHandler(async (req, res) => getController().getNFT(req, res))
);

/**
 * @route   GET /api/nft/user/:userAddress
 * @desc    Get user's NFTs
 * @access  Public
 */
router.get(
  '/user/:userAddress',
  validateEthereumAddress,
  validatePagination,
  asyncHandler(async (req, res) => getController().getUserNFTs(req, res))
);

/**
 * @route   GET /api/nft/stats
 * @desc    Get NFT statistics
 * @access  Public
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => getController().getStats(req, res))
);

export default router;
