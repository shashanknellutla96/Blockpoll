import { ethers } from 'ethers'
import VotingABI from './VotingABI.json'

// Paste your deployed contract address here after running: npx hardhat run scripts/deploy.js --network sepolia
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

export async function getContract(withSigner = false) {
  if (!window.ethereum) throw new Error('MetaMask not found. Please install it.')

  const provider = new ethers.BrowserProvider(window.ethereum)

  if (withSigner) {
    const signer = await provider.getSigner()
    return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, signer)
  }

  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, provider)
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found. Please install it.')
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  return accounts[0]
}

export async function getWalletAddress() {
  if (!window.ethereum) return null
  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  return accounts[0] || null
}