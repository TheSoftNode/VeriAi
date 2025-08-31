import { Request, Response } from 'express';
import { ContractService } from '@/services/ContractService';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export class ContractController {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  /**
   * Mint NFT for verified AI output
   */
  mintNFT = async (req: Request, res: Response): Promise<void> => {
    const {
      userAddress,
      prompt,
      output,
      model,
      requestId,
    } = req.body;

    try {
      const result = await this.contractService.mintNFT({
        userAddress,
        prompt,
        output,
        model,
        requestId,
      });

      logger.info('NFT minted successfully', {
        tokenId: result.tokenId,
        userAddress,
        requestId,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to mint NFT', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAddress,
        requestId,
      });

      throw createError.internal('Failed to mint NFT');
    }
  };

  /**
   * Get NFT details
   */
  getNFT = async (req: Request, res: Response): Promise<void> => {
    const { tokenId } = req.params;

    try {
      const nft = await this.contractService.getNFT(tokenId);

      if (!nft) {
        throw createError.notFound('NFT not found');
      }

      res.status(200).json({
        success: true,
        data: nft,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      logger.error('Failed to fetch NFT', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenId,
      });

      throw createError.internal('Failed to fetch NFT');
    }
  };

  /**
   * Get user's NFTs
   */
  getUserNFTs = async (req: Request, res: Response): Promise<void> => {
    const { userAddress } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
      const nfts = await this.contractService.getUserNFTs({
        userAddress,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        data: nfts,
      });
    } catch (error) {
      logger.error('Failed to fetch user NFTs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAddress,
      });

      throw createError.internal('Failed to fetch user NFTs');
    }
  };

  /**
   * Get verification details from database (not contract)
   */
  getVerificationFromContract = async (req: Request, res: Response): Promise<void> => {
    const { verificationId } = req.params;

    try {
      // Since getVerification was removed from ContractService, 
      // we should use VerificationService or DatabaseService instead
      res.status(501).json({
        success: false,
        message: 'This endpoint is deprecated. Use /api/v1/verification/:requestId instead',
      });
    } catch (error) {
      logger.error('Failed to fetch verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        verificationId,
      });

      throw createError.internal('Failed to fetch verification');
    }
  };

  /**
   * Submit FDC attestation (deprecated - handled by FDC service)
   */
  submitAttestation = async (req: Request, res: Response): Promise<void> => {
    const { verificationId } = req.body;

    try {
      // This functionality has been moved to the VerificationService
      // The FDC attestation is handled automatically when verification is submitted
      res.status(501).json({
        success: false,
        message: 'This endpoint is deprecated. FDC attestation is handled automatically by the verification service',
      });
    } catch (error) {
      logger.error('Failed to submit attestation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        verificationId,
      });

      throw createError.internal('Failed to submit attestation');
    }
  };

  /**
   * Get contract statistics
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.contractService.getStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to fetch contract statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw createError.internal('Failed to fetch contract statistics');
    }
  };
}
