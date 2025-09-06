import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { logger } from '@/utils/logger';
import { DatabaseService } from './DatabaseService';
import { FDCService } from './FDCService';

interface SubmitProofParams {
  prompt: string;
  output: string;
  model: string;
  outputHash?: string;
  userAddress: string;
  signature?: string;
  message?: string;
  attestationData?: any;
}

interface VerifyAttestationParams {
  attestationData: any;
  merkleProof: string[];
}

interface ChallengeVerificationParams {
  verificationId: string;
  challengerAddress: string;
  reason: string;
  evidence: any;
}

interface Verification {
  id: string;
  prompt: string;
  output: string;
  model: string;
  outputHash: string;
  userAddress: string;
  signature: string;
  status: 'pending' | 'verified' | 'challenged' | 'rejected';
  timestamp: string;
  verifiedAt?: string;
  attestationId?: string;
  fdcProof?: any;
  challenges?: Challenge[];
  metadata?: Record<string, any>;
}

interface Challenge {
  id: string;
  verificationId: string;
  challengerAddress: string;
  reason: string;
  evidence: any;
  status: 'pending' | 'resolved' | 'upheld';
  timestamp: string;
  resolvedAt?: string;
}

export class VerificationService {
  private db: DatabaseService;
  private fdcService: FDCService;

  constructor() {
    this.db = new DatabaseService();
    this.fdcService = new FDCService();
  }

  /**
   * Submit proof for verification
   */
  async submitProof(params: SubmitProofParams): Promise<Verification> {
    const {
      prompt,
      output,
      model,
      outputHash,
      userAddress,
      signature,
      message,
      attestationData,
    } = params;

    const verificationId = this.generateVerificationId();
    const timestamp = new Date().toISOString();

    try {
      // 1. VERIFY WALLET SIGNATURE (authentication)
      if (signature) {
        const messageToVerify = message || `Verify AI content with hash: ${outputHash || this.hashOutput(output)}\nTimestamp: ${Date.now()}`;
        
        logger.info('Wallet signature verification attempt', {
          userAddress,
          providedMessage: message,
          messageToVerify,
          signatureLength: signature.length
        });
        
        const isValidSignature = await this.verifySignature(
          userAddress,
          messageToVerify,
          signature
        );

        if (!isValidSignature) {
          logger.error('Wallet signature verification FAILED', {
            userAddress,
            messageToVerify,
            signature
          });
          throw new Error('Invalid wallet signature');
        }
        
        logger.info('Wallet signature verification SUCCESS', {
          userAddress,
          messageLength: messageToVerify.length
        });
      }

      // 2. VERIFY CONTENT HASH (integrity)
      const computedHash = this.hashOutput(output);
      let finalOutputHash = outputHash;
      if (finalOutputHash) {
        if (computedHash !== finalOutputHash) {
          logger.error('Content hash verification FAILED', {
            provided: finalOutputHash,
            computed: computedHash,
            outputLength: output.length,
            outputPreview: output.substring(0, 200),
            outputCharCodes: output.substring(0, 50).split('').map(c => c.charCodeAt(0))
          });
          throw new Error('Content hash mismatch - output was tampered with');
        }
        logger.info('Content hash verification SUCCESS', {
          hash: computedHash,
          outputLength: output.length
        });
      } else {
        // If no hash provided, use computed hash
        finalOutputHash = computedHash;
        logger.info('Generated content hash', {
          hash: finalOutputHash,
          outputLength: output.length
        });
      }

      // Create verification record as completed immediately
      const verification: Verification = {
        id: verificationId,
        prompt,
        output,
        model,
        outputHash: finalOutputHash,
        userAddress,
        signature: signature || '',
        status: 'verified',
        timestamp,
        verifiedAt: timestamp,
        metadata: {
          submittedAt: timestamp,
          attestationData,
          confidence: 95.0, // Default confidence for signed verifications
          completedAt: timestamp,
        },
      };

      // Save to database
      await this.db.saveVerification(verification);

      // Ensure user exists and update stats
      await this.db.updateUserNFTStats(userAddress);

      // Create NFT immediately after verification
      await this.createNFTForVerification(verification);

      // Start FDC attestation process (async, don't wait)
      this.initiateAttestationProcess(verification);

      logger.info('Verification proof submitted', {
        verificationId,
        userAddress,
        model,
      });

      return verification;
    } catch (error) {
      logger.error('Failed to submit verification proof', {
        verificationId,
        userAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Complete verification and mint NFT
   */
  async completeVerificationAndMintNFT(verificationId: string): Promise<void> {
    try {
      // Get the verification record
      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      if (verification.status === 'verified') {
        logger.info('Verification already completed', { verificationId });
        return;
      }

      // Update verification status to verified (completed)
      await this.db.updateVerification(verificationId, {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        metadata: {
          ...verification.metadata,
          completedAt: new Date().toISOString(),
          confidence: 98.5,
        },
      });

      logger.info('Verification marked as completed', {
        verificationId,
        userAddress: verification.userAddress,
      });

      // Create NFT for the completed verification (without blockchain minting for now)
      try {
        // Generate a simple tokenId based on timestamp
        const tokenId = Date.now().toString();
        const confidence = verification.metadata?.confidence || 95.0;
        let rarity: 'common' | 'rare' | 'epic' | 'legendary';
        if (confidence >= 99) rarity = 'legendary';
        else if (confidence >= 97) rarity = 'epic';
        else if (confidence >= 95) rarity = 'rare';
        else rarity = 'common';

        // Create mock transaction hash
        const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;

        logger.info('Creating NFT for verification', {
          verificationId,
          tokenId: tokenId,
          userAddress: verification.userAddress,
        });

        // Update verification with NFT information
        await this.db.updateVerification(verificationId, {
          metadata: {
            ...verification.metadata,
            nftTokenId: tokenId,
            nftTransactionHash: transactionHash,
            nftMintedAt: new Date().toISOString(),
          },
        });

        // Update user stats for NFT minting
        await this.db.updateUserNFTStats(verification.userAddress);

        // Save NFT to database
        await this.db.saveNFT({
          tokenId: tokenId,
          owner: verification.userAddress,
          name: `VeriAI Certificate #${tokenId}`,
          description: verification.prompt.substring(0, 50) + '...',
          image: `/api/nft/${tokenId}/image`,
          prompt: verification.prompt,
          output: verification.output,
          model: verification.model,
          verificationId: verificationId,
          metadataURI: `https://api.veriai.app/nft/${tokenId}/metadata`,
          timestamp: new Date().toISOString(),
          verificationDate: new Date().toISOString(),
          confidence: confidence,
          transactionHash: transactionHash,
          rarity: rarity,
          status: 'minted',
        });

        logger.info('NFT created and saved successfully', {
          verificationId,
          tokenId: tokenId,
          owner: verification.userAddress,
        });

      } catch (nftError) {
        logger.error('Failed to create NFT for verification', {
          verificationId,
          userAddress: verification.userAddress,
          error: nftError instanceof Error ? nftError.message : 'Unknown error',
        });
        // Don't fail the verification completion if NFT creation fails
      }

    } catch (error) {
      logger.error('Failed to complete verification', {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get verification by ID
   */
  async getVerification(verificationId: string): Promise<Verification | null> {
    return this.db.getVerification(verificationId);
  }

  /**
   * Verify FDC attestation
   */
  async verifyAttestation(params: VerifyAttestationParams): Promise<{
    valid: boolean;
    attestationId?: string;
    timestamp: string;
  }> {
    const { attestationData, merkleProof } = params;

    try {
      const verification = await this.fdcService.verifyAttestation(
        attestationData,
        merkleProof
      );

      return {
        valid: verification.valid,
        attestationId: verification.attestationId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to verify FDC attestation', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user's verification history
   */
  async getUserVerifications(params: {
    userAddress: string;
    page: number;
    limit: number;
    status?: string;
  }): Promise<{
    verifications: Verification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userAddress, page, limit, status } = params;
    return this.db.getUserVerifications(userAddress, page, limit, status);
  }

  /**
   * Challenge a verification
   */
  async challengeVerification(params: ChallengeVerificationParams): Promise<Challenge> {
    const { verificationId, challengerAddress, reason, evidence } = params;

    const challengeId = this.generateChallengeId();
    const timestamp = new Date().toISOString();

    try {
      // Check if verification exists
      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      // Check if verification is in a challengeable state
      if (verification.status !== 'verified') {
        throw new Error('Verification cannot be challenged in current state');
      }

      const challenge: Challenge = {
        id: challengeId,
        verificationId,
        challengerAddress,
        reason,
        evidence,
        status: 'pending',
        timestamp,
      };

      // Save challenge
      await this.db.saveChallenge(challenge);

      // Update verification status
      await this.db.updateVerification(verificationId, {
        status: 'challenged',
        metadata: {
          ...verification.metadata,
          challengedAt: timestamp,
          challengeId,
        },
      });

      logger.info('Verification challenged', {
        verificationId,
        challengeId,
        challengerAddress,
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to challenge verification', {
        verificationId,
        challengerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Initiate FDC attestation process
   */
  private async initiateAttestationProcess(verification: Verification): Promise<void> {
    try {
      const attestationRequest = {
        verificationId: verification.id,
        prompt: verification.prompt,
        output: verification.output,
        model: verification.model,
        outputHash: verification.outputHash,
        userAddress: verification.userAddress,
        timestamp: verification.timestamp,
      };

      const attestationId = await this.fdcService.submitAttestation(attestationRequest);

      // Update verification with attestation ID
      await this.db.updateVerification(verification.id, {
        attestationId,
        metadata: {
          ...verification.metadata,
          attestationSubmittedAt: new Date().toISOString(),
        },
      });

      logger.info('FDC attestation initiated', {
        verificationId: verification.id,
        attestationId,
      });
    } catch (error) {
      logger.error('Failed to initiate FDC attestation', {
        verificationId: verification.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update verification status to indicate attestation failure
      await this.db.updateVerification(verification.id, {
        status: 'rejected',
        metadata: {
          ...verification.metadata,
          attestationError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Process FDC attestation callback
   */
  async processAttestationCallback(attestationData: any): Promise<void> {
    try {
      const { verificationId, attestationId, status, proof } = attestationData;

      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      const updatedStatus = status === 'confirmed' ? 'verified' : 'rejected';

      await this.db.updateVerification(verificationId, {
        status: updatedStatus,
        verifiedAt: status === 'confirmed' ? new Date().toISOString() : undefined,
        fdcProof: proof,
        metadata: {
          ...verification.metadata,
          attestationConfirmedAt: new Date().toISOString(),
          attestationStatus: status,
        },
      });

      logger.info('FDC attestation processed', {
        verificationId,
        attestationId,
        status: updatedStatus,
      });
    } catch (error) {
      logger.error('Failed to process FDC attestation callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attestationData,
      });
    }
  }

  /**
   * Verify signature
   */
  private async verifySignature(
    userAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      logger.error('Failed to verify signature', {
        userAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Hash output for verification
   */
  private hashOutput(output: string): string {
    return createHash('sha256').update(output).digest('hex');
  }

  /**
   * Generate verification ID
   */
  private generateVerificationId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate challenge ID
   */
  private generateChallengeId(): string {
    return `chg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Fulfill verification with FDC attestation result
   */
  async fulfillVerification(params: {
    verificationId: string;
    fdcAttestationId: string;
    proof: any;
    verified: boolean;
  }): Promise<Verification | null> {
    const { verificationId, fdcAttestationId, proof, verified } = params;

    try {
      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      const updateData = {
        status: (verified ? 'verified' : 'rejected') as 'verified' | 'rejected',
        verifiedAt: verified ? new Date().toISOString() : undefined,
        attestationId: fdcAttestationId,
        fdcProof: proof,
        metadata: {
          ...verification.metadata,
          fulfillmentTimestamp: new Date().toISOString(),
          fdcAttestationId,
        },
      };

      await this.db.updateVerification(verificationId, updateData);

      logger.info('Verification fulfilled', {
        verificationId,
        verified,
        fdcAttestationId,
      });

      return await this.db.getVerification(verificationId);
    } catch (error) {
      logger.error('Failed to fulfill verification', {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retry failed verification
   */
  async retryVerification(verificationId: string): Promise<Verification | null> {
    try {
      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      // Reset status and initiate new attestation process
      await this.db.updateVerification(verificationId, {
        status: 'pending',
        metadata: {
          ...verification.metadata,
          retryTimestamp: new Date().toISOString(),
          retryCount: (verification.metadata?.retryCount || 0) + 1,
        },
      });

      // Reinitiate attestation process
      const updatedVerification = await this.db.getVerification(verificationId);
      if (updatedVerification) {
        await this.initiateAttestationProcess(updatedVerification);
      }

      logger.info('Verification retry initiated', {
        verificationId,
        retryCount: (verification.metadata?.retryCount || 0) + 1,
      });

      return await this.db.getVerification(verificationId);
    } catch (error) {
      logger.error('Failed to retry verification', {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update verification with NFT information
   */
  async updateVerificationNFT(verificationId: string, nftData: {
    nftTokenId: string;
    transactionHash: string;
    blockNumber: number;
  }): Promise<void> {
    try {
      const verification = await this.db.getVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      await this.db.updateVerification(verificationId, {
        metadata: {
          ...verification.metadata,
          nftTokenId: nftData.nftTokenId,
          nftTransactionHash: nftData.transactionHash,
          nftBlockNumber: nftData.blockNumber,
          nftMintedAt: new Date().toISOString(),
        },
      });

      logger.info('Verification updated with NFT information', {
        verificationId,
        nftTokenId: nftData.nftTokenId,
        transactionHash: nftData.transactionHash,
      });
    } catch (error) {
      logger.error('Failed to update verification with NFT data', {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create NFT for completed verification
   */
  private async createNFTForVerification(verification: Verification): Promise<void> {
    try {
      // Generate a simple tokenId based on timestamp
      const tokenId = Date.now().toString();
      
      // Determine rarity based on confidence
      const confidence = verification.metadata?.confidence || 95.0;
      let rarity: 'common' | 'rare' | 'epic' | 'legendary';
      if (confidence >= 99) rarity = 'legendary';
      else if (confidence >= 97) rarity = 'epic';
      else if (confidence >= 95) rarity = 'rare';
      else rarity = 'common';

      // Create NFT data matching the frontend structure
      const nftData = {
        tokenId: tokenId,
        owner: verification.userAddress,
        name: `VeriAI Certificate #${tokenId}`,
        description: verification.prompt.substring(0, 50) + '...',
        image: `/api/nft/${tokenId}/image`,
        prompt: verification.prompt,
        output: verification.output,
        model: verification.model,
        verificationId: verification.id,
        metadataURI: `https://api.veriai.app/nft/${tokenId}/metadata`,
        timestamp: verification.timestamp,
        verificationDate: verification.timestamp,
        confidence: confidence,
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`, // Mock transaction hash
        rarity: rarity,
        status: 'minted',
      };

      // Save NFT to database
      await this.db.saveNFT(nftData);

      logger.info('NFT created for verification', {
        verificationId: verification.id,
        tokenId: tokenId,
        owner: verification.userAddress,
        rarity: rarity,
      });

    } catch (error) {
      logger.error('Failed to create NFT for verification', {
        verificationId: verification.id,
        userAddress: verification.userAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw error to avoid breaking verification process
    }
  }

  /**
   * Get verification statistics
   */
  async getStats(): Promise<{
    totalVerifications: number;
    verifiedCount: number;
    challengedCount: number;
    rejectedCount: number;
    successRate: number;
  }> {
    return this.db.getVerificationStats();
  }
}
