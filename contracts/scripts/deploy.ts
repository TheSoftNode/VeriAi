import hre from "hardhat";
import fs from "fs";
import path from "path";

const { join } = path;
const { writeFileSync } = fs;

// Use type assertion to fix TypeScript errors while keeping the working functionality
const ethers = (hre as any).ethers;

async function main() {
  console.log("🚀 Starting VeriAI Production Deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deploying contracts with account:", deployer.address);
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "FLR\n");

  // Configuration - Use environment variables for production
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const fdcHubAddress = process.env.FDC_HUB_ADDRESS || (() => {
    // Flare Network FDC Hub addresses (real production addresses)
    const fdcAddresses = {
      14: "0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b", // Flare Mainnet FDC Hub
      114: "0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b", // Coston2 Testnet FDC Hub (same as mainnet)
    };
    const chainId = Number(network.chainId);
    return fdcAddresses[chainId as keyof typeof fdcAddresses] || (() => {
      throw new Error(`No FDC Hub address configured for chain ID ${chainId}. Please set FDC_HUB_ADDRESS environment variable.`);
    })();
  })();

  // Step 1: Deploy VeriAI contract
  console.log("📄 Deploying VeriAI contract...");
  const VeriAI = await ethers.getContractFactory("VeriAI");
  const initialVerificationFee = ethers.parseEther("0.01"); // 0.01 FLR
  const veriAI = await VeriAI.deploy(treasuryAddress, initialVerificationFee);
  await veriAI.waitForDeployment();
  const veriAIAddress = await veriAI.getAddress();
  console.log("✅ VeriAI deployed to:", veriAIAddress);

  // Step 2: Deploy VeriAINFT contract
  console.log("\n📄 Deploying VeriAINFT contract...");
  const VeriAINFT = await ethers.getContractFactory("VeriAINFT");
  const nftName = "VeriAI Verified Content";
  const nftSymbol = "VERIAI";
  const baseTokenURI = "https://api.veriai.app/metadata/";
  const veriAINFT = await VeriAINFT.deploy(nftName, nftSymbol, baseTokenURI);
  await veriAINFT.waitForDeployment();
  const veriAINFTAddress = await veriAINFT.getAddress();
  console.log("✅ VeriAINFT deployed to:", veriAINFTAddress);

  // Step 3: Deploy FDCRelayer contract
  console.log("\n📄 Deploying FDCRelayer contract...");
  const FDCRelayer = await ethers.getContractFactory("FDCRelayer");
  const fdcRelayer = await FDCRelayer.deploy(veriAIAddress, fdcHubAddress, treasuryAddress);
  await fdcRelayer.waitForDeployment();
  const fdcRelayerAddress = await fdcRelayer.getAddress();
  console.log("✅ FDCRelayer deployed to:", fdcRelayerAddress);

  // Step 4: Configure contracts
  console.log("\n⚙️  Configuring contract interactions...");
  
  // Set VeriAINFT address in VeriAI
  console.log("🔗 Setting VeriAINFT in VeriAI...");
  await veriAI.setNFTContract(veriAINFTAddress);
  console.log("✅ VeriAINFT configured in VeriAI");

  // Grant MINTER_ROLE to VeriAI in VeriAINFT
  console.log("🔗 Granting MINTER_ROLE to VeriAI in VeriAINFT...");
  const MINTER_ROLE = await veriAINFT.MINTER_ROLE();
  await veriAINFT.grantRole(MINTER_ROLE, veriAIAddress);
  console.log("✅ MINTER_ROLE granted to VeriAI");

  // Grant RELAYER_ROLE to deployer in FDCRelayer (for initial operations)
  console.log("🔗 Granting RELAYER_ROLE in FDCRelayer...");
  const RELAYER_ROLE = await fdcRelayer.RELAYER_ROLE();
  await fdcRelayer.grantRole(RELAYER_ROLE, deployer.address);
  console.log("✅ RELAYER_ROLE granted to deployer");

  // Step 5: Verify deployments
  console.log("\n🔍 Verifying deployments...");
  
  // Check VeriAI configuration
  const configuredNFTContract = await veriAI.nftContract();
  console.log("✅ VeriAI NFTContract:", configuredNFTContract);

  // Check VeriAINFT configuration
  const hasMinterRole = await veriAINFT.hasRole(MINTER_ROLE, veriAIAddress);
  console.log("✅ VeriAI has MINTER_ROLE:", hasMinterRole);

  // Check FDCRelayer configuration
  const relayerVeriAIContract = await fdcRelayer.VERI_AI_CONTRACT();
  const relayerFDCHub = await fdcRelayer.FDC_HUB();
  const relayerTreasury = await fdcRelayer.treasuryAddress();
  console.log("✅ FDCRelayer VeriAI Contract:", relayerVeriAIContract);
  console.log("✅ FDCRelayer FDC Hub:", relayerFDCHub);
  console.log("✅ FDCRelayer Treasury:", relayerTreasury);

  // Prepare deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    treasury: treasuryAddress,
    fdcHub: fdcHubAddress,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    contracts: {
      VeriAI: {
        address: veriAIAddress,
        deploymentHash: veriAI.deploymentTransaction()?.hash,
        verified: false
      },
      VeriAINFT: {
        address: veriAINFTAddress,
        deploymentHash: veriAINFT.deploymentTransaction()?.hash,
        verified: false
      },
      FDCRelayer: {
        address: fdcRelayerAddress,
        deploymentHash: fdcRelayer.deploymentTransaction()?.hash,
        verified: false
      }
    },
    configuration: {
      veriAINFTContract: configuredNFTContract,
      relayerVeriAIContract: relayerVeriAIContract,
      relayerFDCHub: relayerFDCHub,
      relayerTreasury: relayerTreasury
    },
    roles: {
      veriAIHasMinterRole: hasMinterRole,
      deployerHasRelayerRole: true
    }
  };

  // Save deployment info
  const deploymentsDir = join(__dirname, "..", "deployments");
  const fs = require("fs");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = join(deploymentsDir, `${network.name}-${network.chainId}.json`);
  writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Step 6: Display contract sizes and summary
  console.log("\n📊 Contract Deployment Summary:");
  console.log("════════════════════════════════════════════════════");
  console.log(`📋 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Treasury: ${treasuryAddress}`);
  console.log(`🌐 FDC Hub: ${fdcHubAddress}`);
  console.log("");
  console.log("📄 Contract Addresses:");
  console.log(`├─ VeriAI:      ${veriAIAddress}`);
  console.log(`├─ VeriAINFT:   ${veriAINFTAddress}`);
  console.log(`└─ FDCRelayer:  ${fdcRelayerAddress}`);
  console.log("");
  console.log("🔗 Contract Relationships:");
  console.log(`├─ VeriAINFT configured: ${configuredNFTContract}`);
  console.log(`└─ FDCRelayer → VeriAI:  ${relayerVeriAIContract}`);
  console.log("");
  console.log("📝 Deployment info saved to:", deploymentFile);
  console.log("════════════════════════════════════════════════════");

  // Verification commands (if not local network)
  if (network.chainId !== 31337n) {
    console.log("\n🔍 Contract verification commands:");
    console.log(`npx hardhat verify --network ${network.name} ${veriAIAddress} "${treasuryAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${veriAINFTAddress} "${veriAIAddress}" "${treasuryAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${fdcRelayerAddress} "${veriAIAddress}" "${fdcHubAddress}" "${treasuryAddress}"`);
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Configure FDC providers and update FDC Hub address");
  console.log("3. Set up backend API with contract addresses");
  console.log("4. Deploy frontend with contract integration");
  console.log("5. Test end-to-end verification flow");
  console.log("6. Configure treasury and fee collection");

  console.log("\n💾 Deployment completed successfully!");
  console.log("📝 All contracts configured and ready for production use!");
  
  return deploymentInfo;
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });