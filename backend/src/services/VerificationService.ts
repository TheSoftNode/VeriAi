import { createHash } from 'crypto';
import { ethers } from 'ethers';
import axios from 'axios';
import { logger } from '@/utils/logger';
import { DatabaseService } from './DatabaseService';
import { FDCService } from './FDCService';

interface SubmitProofParams {
  prompt: string;
  output: string;
  model: string;
  outputHash: string;
  userAddress: string;
  signature: string;
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
      attestationData,
    } = params;

    const verificationId = this.generateVerificationId();
    const timestamp = new Date().toISOString();

    try {
      // Verify signature
      const isValidSignature = await this.verifySignature(
        userAddress,
        outputHash,
        signature
      );

      if (!isValidSignature) {
        throw new Error('Invalid signature');
      }

      // Verify output hash
      const computedHash = this.hashOutput(output);
      if (computedHash !== outputHash) {
        throw new Error('Output hash mismatch');
      }

      // Create verification record
      const verification: Verification = {
        id: verificationId,
        prompt,
        output,
        model,
        outputHash,
        userAddress,
        signature,
        status: 'pending',
        timestamp,
        metadata: {
          submittedAt: timestamp,
          attestationData,
        },
      };

      // Save to database
      await this.db.saveVerification(verification);

      // Start FDC attestation process
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
