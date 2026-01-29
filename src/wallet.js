// Wallet & NFT Integration
import { supabase } from './supabase.js';

export class WalletManager {
  constructor() {
    this.connectedAddress = null;
    this.nfts = [];
  }

  async connectMetaMask() {
    if (!window.ethereum) {
      alert('MetaMask not installed! Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return null;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      this.connectedAddress = accounts[0];
      
      console.log('✓ Wallet connected:', this.connectedAddress);
      
      // Save to user profile
      await this.saveWalletAddress(this.connectedAddress);
      
      // Fetch NFTs
      await this.fetchNFTs();
      
      return this.connectedAddress;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet: ' + error.message);
      return null;
    }
  }

  async saveWalletAddress(address) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          metadata: { wallet_address: address }
        })
        .eq('id', user.id);
      
      console.log('✓ Wallet address saved to profile');
    } catch (error) {
      console.error('Failed to save wallet address:', error);
    }
  }

  async fetchNFTs() {
    if (!this.connectedAddress) return [];

    try {
      console.log('Fetching NFTs from OpenSea...');
      
      // OpenSea API v2
      const response = await fetch(
        `https://api.opensea.io/api/v2/chain/ethereum/account/${this.connectedAddress}/nfts?limit=50`,
        {
          headers: {
            'X-API-KEY': 'demo' // Replace with your OpenSea API key for production
          }
        }
      );

      if (!response.ok) {
        throw new Error('OpenSea API request failed');
      }

      const data = await response.json();
      this.nfts = data.nfts || [];
      
      console.log(`✓ Loaded ${this.nfts.length} NFTs from OpenSea`);
      return this.nfts;
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
      alert('Could not load NFTs. You may need an OpenSea API key for production use.');
      return [];
    }
  }

  getNFTImageUrl(nft) {
    // Try multiple image sources
    if (nft.image_url) return nft.image_url;
    if (nft.display_image_url) return nft.display_image_url;
    if (nft.metadata?.image) return nft.metadata.image;
    if (nft.image) return nft.image;
    
    // Fallback: try to get from IPFS
    if (nft.metadata?.image_url) {
      const url = nft.metadata.image_url;
      if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      return url;
    }
    
    return null;
  }

  getNFTName(nft) {
    return nft.name || nft.metadata?.name || `NFT #${nft.identifier || '???'}`;
  }

  getNFTCollection(nft) {
    return nft.collection || nft.contract?.name || 'Unknown Collection';
  }

  getShortAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

// Make globally available
window.WalletManager = WalletManager;
