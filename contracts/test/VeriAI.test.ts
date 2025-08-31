import { expect } from "chai";
import { ethers } from "hardhat";
import { VeriAI, VeriAINFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("VeriAI Production Contract Suite", function () {
  let veriAI: VeriAI;
  let veriAINFT: VeriAINFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let relayer: SignerWithAddress;

  const VERIFICATION_FEE = ethers.parseEther("0.01");
  const NFT_NAME = "VeriAI Verification Certificate";
  const NFT_SYMBOL = "VERIAI";
  const BASE_URI = "https://api.veriai.app/metadata";

  async function deployVeriAIFixture() {
    const [owner, user1, user2, treasury, relayer] = await ethers.getSigners();

    // Deploy VeriAI Contract
    const VeriAI = await ethers.getContractFactory("VeriAI");
    const veriAI = await VeriAI.deploy(treasury.address, VERIFICATION_FEE);

    // Deploy VeriAINFT Contract 
    const VeriAINFT = await ethers.getContractFactory("VeriAINFT_Production");
    const veriAINFT = await VeriAINFT.deploy(NFT_NAME, NFT_SYMBOL, BASE_URI);

    // Setup roles and configuration
    const minterRole = await veriAINFT.MINTER_ROLE();
    await veriAINFT.grantRole(minterRole, await veriAI.getAddress());
    
    const fdcRelayerRole = await veriAI.FDC_RELAYER_ROLE();
    await veriAI.grantRole(fdcRelayerRole, relayer.address);
    
    await veriAI.setNFTContract(await veriAINFT.getAddress());

    return {
      veriAI,
      veriAINFT,
      owner,
      user1,
      user2,
      treasury,
      relayer,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployVeriAIFixture);
    veriAI = fixture.veriAI;
    veriAINFT = fixture.veriAINFT;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    treasury = fixture.treasury;
    relayer = fixture.relayer;
  });

  describe("VeriAI Contract", function () {
    describe("Deployment", function () {
      it("Should deploy with correct initial values", async function () {
        expect(await veriAI.verificationFee()).to.equal(VERIFICATION_FEE);
        expect(await veriAI.treasuryAddress()).to.equal(treasury.address);
        expect(await veriAI.hasRole(await veriAI.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      });

      it("Should reject invalid constructor parameters", async function () {
        const VeriAI = await ethers.getContractFactory("VeriAI");
        
        // Invalid treasury address
        await expect(
          VeriAI.deploy(ethers.ZeroAddress, VERIFICATION_FEE)
        ).to.be.revertedWithCustomError(veriAI, "InvalidTreasuryAddress");

        // Invalid fee amount
        await expect(
          VeriAI.deploy(treasury.address, ethers.parseEther("0.001"))
        ).to.be.revertedWithCustomError(veriAI, "InvalidFeeAmount");
      });
    });

    describe("Verification Requests", function () {
      it("Should create verification request successfully", async function () {
        const prompt = "Explain quantum computing";
        const model = "gpt-4";

        const tx = await veriAI.connect(user1).requestVerification(prompt, model, {
          value: VERIFICATION_FEE,
        });

        const receipt = await tx.wait();
        const event = receipt?.logs.find(
          (log: any) => log.eventName === "VerificationRequested"
        );

        expect(event).to.exist;
        expect(event?.args?.requester).to.equal(user1.address);
        expect(event?.args?.model).to.equal(model);
        expect(event?.args?.fee).to.equal(VERIFICATION_FEE);

        // Check user request count
        expect(await veriAI.getUserRequestCount(user1.address)).to.equal(1);
      });

      it("Should reject verification request with insufficient fee", async function () {
        const prompt = "Test prompt";
        const model = "gpt-4";

        await expect(
          veriAI.connect(user1).requestVerification(prompt, model, {
            value: ethers.parseEther("0.005"), // Less than required
          })
        ).to.be.revertedWithCustomError(veriAI, "InsufficientFee");
      });

      it("Should reject invalid prompt length", async function () {
        const shortPrompt = "";
        const longPrompt = "a".repeat(2001); // Exceeds MAX_PROMPT_LENGTH
        const model = "gpt-4";

        await expect(
          veriAI.connect(user1).requestVerification(shortPrompt, model, {
            value: VERIFICATION_FEE,
          })
        ).to.be.revertedWithCustomError(veriAI, "InvalidPromptLength");

        await expect(
          veriAI.connect(user1).requestVerification(longPrompt, model, {
            value: VERIFICATION_FEE,
          })
        ).to.be.revertedWithCustomError(veriAI, "InvalidPromptLength");
      });

      it("Should enforce rate limiting", async function () {
        const prompt = "Test prompt";
        const model = "gpt-4";

        // First request should succeed
        await veriAI.connect(user1).requestVerification(prompt, model, {
          value: VERIFICATION_FEE,
        });

        // Second request within rate limit window should fail
        await expect(
          veriAI.connect(user1).requestVerification(prompt, model, {
            value: VERIFICATION_FEE,
          })
        ).to.be.revertedWithCustomError(veriAI, "RateLimitExceeded");
      });

      it("Should transfer fee to treasury", async function () {
        const prompt = "Test prompt";
        const model = "gpt-4";
        const initialTreasuryBalance = await ethers.provider.getBalance(treasury.address);

        await veriAI.connect(user1).requestVerification(prompt, model, {
          value: VERIFICATION_FEE,
        });

        const finalTreasuryBalance = await ethers.provider.getBalance(treasury.address);
        expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(VERIFICATION_FEE);
      });
    });

    describe("Verification Fulfillment", function () {
      let requestId: string;

      beforeEach(async function () {
        const prompt = "Test prompt";
        const model = "gpt-4";

        const tx = await veriAI.connect(user1).requestVerification(prompt, model, {
          value: VERIFICATION_FEE,
        });

        const receipt = await tx.wait();
        const event = receipt?.logs.find(
          (log: any) => log.eventName === "VerificationRequested"
        );
        requestId = event?.args?.requestId;
      });

      it("Should fulfill verification successfully", async function () {
        const output = "Quantum computing uses quantum mechanics...";
        const attestationId = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));
        const proof = ethers.toUtf8Bytes("test-proof");

        const tx = await veriAI
          .connect(relayer)
          .fulfillVerification(requestId, output, attestationId, proof);

        const receipt = await tx.wait();
        const event = receipt?.logs.find(
          (log: any) => log.eventName === "VerificationFulfilled"
        );

        expect(event).to.exist;
        expect(event?.args?.requestId).to.equal(requestId);
        expect(event?.args?.attestationId).to.equal(attestationId);

        // Check request is marked as verified
        const request = await veriAI.getVerificationRequest(requestId);
        expect(request.verified).to.be.true;

        // Check output verification
        expect(await veriAI.verifyOutput(requestId, output)).to.be.true;
        expect(await veriAI.verifyOutput(requestId, "wrong output")).to.be.false;
      });

      it("Should reject fulfillment from unauthorized address", async function () {
        const output = "Test output";
        const attestationId = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));
        const proof = ethers.toUtf8Bytes("test-proof");

        await expect(
          veriAI
            .connect(user2)
            .fulfillVerification(requestId, output, attestationId, proof)
        ).to.be.revertedWith(/AccessControl/);
      });

      it("Should reject duplicate attestation IDs", async function () {
        const output = "Test output";
        const attestationId = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));
        const proof = ethers.toUtf8Bytes("test-proof");

        // First fulfillment should succeed
        await veriAI
          .connect(relayer)
          .fulfillVerification(requestId, output, attestationId, proof);

        // Create another request
        const tx = await veriAI.connect(user2).requestVerification("Another prompt", "gpt-4", {
          value: VERIFICATION_FEE,
        });

        const receipt = await tx.wait();
        const event = receipt?.logs.find(
          (log: any) => log.eventName === "VerificationRequested"
        );
        const newRequestId = event?.args?.requestId;

        // Second fulfillment with same attestation ID should fail
        await expect(
          veriAI
            .connect(relayer)
            .fulfillVerification(newRequestId, output, attestationId, proof)
        ).to.be.revertedWithCustomError(veriAI, "AttestationAlreadyProcessed");
      });
    });

    describe("Admin Functions", function () {
      it("Should allow admin to update verification fee", async function () {
        const newFee = ethers.parseEther("0.02");

        const tx = await veriAI.setVerificationFee(newFee);
        await tx.wait();

        expect(await veriAI.verificationFee()).to.equal(newFee);
      });

      it("Should reject fee update below minimum", async function () {
        const lowFee = ethers.parseEther("0.005");

        await expect(
          veriAI.setVerificationFee(lowFee)
        ).to.be.revertedWithCustomError(veriAI, "InvalidFeeAmount");
      });

      it("Should allow admin to pause/unpause contract", async function () {
        await veriAI.pause();
        expect(await veriAI.paused()).to.be.true;

        // Should reject requests when paused
        await expect(
          veriAI.connect(user1).requestVerification("Test", "gpt-4", {
            value: VERIFICATION_FEE,
          })
        ).to.be.revertedWith("Pausable: paused");

        await veriAI.unpause();
        expect(await veriAI.paused()).to.be.false;
      });

      it("Should allow emergency withdrawal", async function () {
        // Send some FLR to contract
        await owner.sendTransaction({
          to: await veriAI.getAddress(),
          value: ethers.parseEther("1.0"),
        });

        const initialBalance = await ethers.provider.getBalance(treasury.address);
        await veriAI.emergencyWithdraw();
        const finalBalance = await ethers.provider.getBalance(treasury.address);

        expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));
      });
    });
  });

  describe("VeriAINFT Contract", function () {
    describe("Deployment", function () {
      it("Should deploy with correct initial values", async function () {
        expect(await veriAINFT.name()).to.equal(NFT_NAME);
        expect(await veriAINFT.symbol()).to.equal(NFT_SYMBOL);
        expect(await veriAINFT.baseURI()).to.equal(BASE_URI);
        expect(await veriAINFT.totalSupply()).to.equal(0);
      });
    });

    describe("Minting", function () {
      it("Should mint verification NFT successfully", async function () {
        const metadata = {
          prompt: "Test prompt",
          model: "gpt-4",
          outputHash: "0x1234567890abcdef",
          timestamp: await time.latest(),
          proofHash: ethers.keccak256(ethers.toUtf8Bytes("proof")),
          verified: true,
          verifier: owner.address,
        };

        // Grant minter role to owner for testing
        const minterRole = await veriAINFT.MINTER_ROLE();
        await veriAINFT.grantRole(minterRole, owner.address);

        const tx = await veriAINFT.connect(owner).mintVerificationNFT(user1.address, metadata);
        const receipt = await tx.wait();

        const event = receipt?.logs.find(
          (log: any) => log.eventName === "VerificationNFTMinted"
        );

        expect(event).to.exist;
        expect(event?.args?.recipient).to.equal(user1.address);
        expect(event?.args?.model).to.equal(metadata.model);

        // Check NFT was minted
        expect(await veriAINFT.totalSupply()).to.equal(1);
        expect(await veriAINFT.ownerOf(0)).to.equal(user1.address);

        // Check metadata
        const retrievedMetadata = await veriAINFT.getVerificationData(0);
        expect(retrievedMetadata.prompt).to.equal(metadata.prompt);
        expect(retrievedMetadata.model).to.equal(metadata.model);
        expect(retrievedMetadata.verified).to.equal(metadata.verified);
      });

      it("Should reject minting from unauthorized address", async function () {
        const metadata = {
          prompt: "Test prompt",
          model: "gpt-4",
          outputHash: "0x1234567890abcdef",
          timestamp: await time.latest(),
          proofHash: ethers.keccak256(ethers.toUtf8Bytes("proof")),
          verified: true,
          verifier: owner.address,
        };

        await expect(
          veriAINFT.connect(user1).mintVerificationNFT(user1.address, metadata)
        ).to.be.revertedWith(/AccessControl/);
      });
    });

    describe("Token Management", function () {
      it("Should track tokens by owner correctly", async function () {
        const minterRole = await veriAINFT.MINTER_ROLE();
        await veriAINFT.grantRole(minterRole, owner.address);

        const metadata = {
          prompt: "Test prompt",
          model: "gpt-4",
          outputHash: "0x1234567890abcdef",
          timestamp: await time.latest(),
          proofHash: ethers.keccak256(ethers.toUtf8Bytes("proof")),
          verified: true,
          verifier: owner.address,
        };

        // Mint multiple NFTs
        await veriAINFT.connect(owner).mintVerificationNFT(user1.address, metadata);
        await veriAINFT.connect(owner).mintVerificationNFT(user1.address, metadata);
        await veriAINFT.connect(owner).mintVerificationNFT(user2.address, metadata);

        const user1Tokens = await veriAINFT.getTokensByOwner(user1.address);
        const user2Tokens = await veriAINFT.getTokensByOwner(user2.address);

        expect(user1Tokens.length).to.equal(2);
        expect(user2Tokens.length).to.equal(1);
        expect(user1Tokens).to.deep.equal([0n, 1n]);
        expect(user2Tokens).to.deep.equal([2n]);
      });

      it("Should generate correct token URI", async function () {
        const minterRole = await veriAINFT.MINTER_ROLE();
        await veriAINFT.grantRole(minterRole, owner.address);

        const metadata = {
          prompt: "Test prompt",
          model: "gpt-4",
          outputHash: "0x1234567890abcdef",
          timestamp: await time.latest(),
          proofHash: ethers.keccak256(ethers.toUtf8Bytes("proof")),
          verified: true,
          verifier: owner.address,
        };

        await veriAINFT.connect(owner).mintVerificationNFT(user1.address, metadata);

        const tokenURI = await veriAINFT.tokenURI(0);
        expect(tokenURI).to.include("data:application/json;base64,");

        // Decode and verify JSON structure
        const base64Data = tokenURI.split(",")[1];
        const jsonString = Buffer.from(base64Data, "base64").toString();
        const tokenMetadata = JSON.parse(jsonString);

        expect(tokenMetadata.name).to.include("VeriAI Verification Certificate");
        expect(tokenMetadata.description).to.include("Cryptographically verified");
        expect(tokenMetadata.prompt).to.equal(metadata.prompt);
        expect(tokenMetadata.verified).to.equal(metadata.verified);
      });
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full verification flow", async function () {
      const prompt = "Explain machine learning";
      const model = "gpt-4";
      const output = "Machine learning is a subset of artificial intelligence...";

      // Step 1: User requests verification
      const requestTx = await veriAI.connect(user1).requestVerification(prompt, model, {
        value: VERIFICATION_FEE,
      });

      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (log: any) => log.eventName === "VerificationRequested"
      );
      const requestId = requestEvent?.args?.requestId;

      // Step 2: FDC relayer fulfills verification
      const attestationId = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));
      const proof = ethers.toUtf8Bytes("test-proof");

      const fulfillTx = await veriAI
        .connect(relayer)
        .fulfillVerification(requestId, output, attestationId, proof);

      const fulfillReceipt = await fulfillTx.wait();
      const fulfillEvent = fulfillReceipt?.logs.find(
        (log: any) => log.eventName === "VerificationFulfilled"
      );

      expect(fulfillEvent).to.exist;

      // Step 3: Verify NFT was minted
      expect(await veriAINFT.totalSupply()).to.equal(1);
      expect(await veriAINFT.ownerOf(0)).to.equal(user1.address);

      // Step 4: Verify output can be validated
      expect(await veriAI.verifyOutput(requestId, output)).to.be.true;

      // Step 5: Check verification request status
      const request = await veriAI.getVerificationRequest(requestId);
      expect(request.verified).to.be.true;
      expect(request.requester).to.equal(user1.address);
      expect(request.prompt).to.equal(prompt);
      expect(request.model).to.equal(model);
    });

    it("Should handle verification failure gracefully", async function () {
      const prompt = "Test prompt";
      const model = "gpt-4";

      // Request verification
      const requestTx = await veriAI.connect(user1).requestVerification(prompt, model, {
        value: VERIFICATION_FEE,
      });

      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (log: any) => log.eventName === "VerificationRequested"
      );
      const requestId = requestEvent?.args?.requestId;

      // Mark verification as failed
      const failTx = await veriAI
        .connect(relayer)
        .markVerificationFailed(requestId, "FDC request timeout");

      const failReceipt = await failTx.wait();
      const failEvent = failReceipt?.logs.find(
        (log: any) => log.eventName === "VerificationFailed"
      );

      expect(failEvent).to.exist;
      expect(failEvent?.args?.requestId).to.equal(requestId);
      expect(failEvent?.args?.reason).to.equal("FDC request timeout");

      // Verify no NFT was minted
      expect(await veriAINFT.totalSupply()).to.equal(0);
    });
  });
});
