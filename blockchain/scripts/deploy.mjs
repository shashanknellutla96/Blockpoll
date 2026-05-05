import hre from "hardhat";

async function main() {
  console.log("Deploying Voting contract to Sepolia...");

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("✅ Contract deployed to:", address);
  console.log("Paste this into your frontend .env as VITE_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});