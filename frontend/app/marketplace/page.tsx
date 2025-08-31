'use client';

import React, { useState, useEffect } from const MarketplacePage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-8">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return <MarketplaceContent />;
};

const MarketplaceContent = () => {
  const { requireWallet, address } = useWalletActions();eact';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Search, 
  Filter, 
  ShoppingCart, 
  Eye, 
  Heart, 
  Share2,
  TrendingUp,
  Calendar,
  Zap,
  Shield,
  Trophy,
  Star,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWalletActions } from '@/lib/contexts/WalletContext';
import { nftApi } from '@/lib/api/client';
import { APP_CONFIG } from '@/lib/config';
import { toast } from 'sonner';

interface MarketplaceNFT {
  tokenId: string;
  name: string;
  description: string;
  image?: string;
  price: bigint;
  seller: string;
  isForSale: boolean;
  verificationData: {
    prompt: string;
    model: string;
    outputHash: string;
    timestamp: number;
    verified: boolean;
    confidence: number;
  };
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  likes: number;
  views: number;
  lastSale?: {
    price: bigint;
    timestamp: number;
  };
}

const NFTMarketplacePage = () => {
  const { requireWallet, address } = useWalletActions();
  const [nfts, setNfts] = useState<MarketplaceNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterModel, setFilterModel] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadMarketplaceNFTs();
  }, [sortBy, filterModel]);

  const loadMarketplaceNFTs = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration - replace with actual API call
      const mockNFTs: MarketplaceNFT[] = [
        {
          tokenId: '1',
          name: 'AI Genesis Story #001',
          description: 'A captivating tale about AI consciousness, verified and authenticated on Flare Network.',
          image: 'https://api.veriai.app/nft/1/image',
          price: BigInt('1000000000000000000'), // 1 FLR
          seller: '0x742d35Cc6327C0532B44F8e2f51Bd773C10F90E0',
          isForSale: true,
          verificationData: {
            prompt: 'Write a science fiction story about AI consciousness',
            model: 'gpt-4',
            outputHash: '0xabc123...',
            timestamp: Date.now() - 86400000,
            verified: true,
            confidence: 97.5
          },
          attributes: [
            { trait_type: 'Genre', value: 'Science Fiction' },
            { trait_type: 'Length', value: '1200 words' },
            { trait_type: 'Rarity', value: 'Common' }
          ],
          likes: 45,
          views: 1230
        },
        {
          tokenId: '2',
          name: 'Quantum Poetry Collection',
          description: 'Ethereal poems exploring quantum mechanics through AI creativity.',
          price: BigInt('2500000000000000000'), // 2.5 FLR
          seller: '0x123456789abcdef123456789abcdef1234567890',
          isForSale: true,
          verificationData: {
            prompt: 'Create poetry about quantum physics and consciousness',
            model: 'claude-3',
            outputHash: '0xdef456...',
            timestamp: Date.now() - 172800000,
            verified: true,
            confidence: 94.2
          },
          attributes: [
            { trait_type: 'Genre', value: 'Poetry' },
            { trait_type: 'Length', value: '800 words' },
            { trait_type: 'Rarity', value: 'Rare' }
          ],
          likes: 78,
          views: 2100,
          lastSale: {
            price: BigInt('2000000000000000000'),
            timestamp: Date.now() - 259200000
          }
        }
      ];

      setNfts(mockNFTs);
    } catch (error) {
      console.error('Error loading marketplace NFTs:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNFT = async (nft: MarketplaceNFT) => {
    if (!requireWallet('purchase this NFT')) return;

    try {
      toast.info('Purchase functionality coming soon!', {
        description: 'NFT marketplace trading will be available in the next update.',
      });
      
      // TODO: Implement actual purchase logic
      // const response = await contractCall to purchase NFT
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase NFT');
    }
  };

  const handleLikeNFT = async (tokenId: string) => {
    if (!requireWallet('like this NFT')) return;

    try {
      // TODO: Implement like functionality
      toast.success('NFT liked!');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like NFT');
    }
  };

  const filteredNFTs = nfts.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nft.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nft.verificationData.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModel = filterModel === 'all' || nft.verificationData.model === filterModel;
    
    const matchesPrice = (!priceRange.min || Number(nft.price) >= Number(priceRange.min) * 1e18) &&
                        (!priceRange.max || Number(nft.price) <= Number(priceRange.max) * 1e18);
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'for-sale' && nft.isForSale) ||
                      (activeTab === 'verified' && nft.verificationData.verified);

    return matchesSearch && matchesModel && matchesPrice && matchesTab;
  });

  const formatPrice = (price: bigint) => {
    return `${(Number(price) / 1e18).toFixed(2)} FLR`;
  };

  const getModelBadgeColor = (model: string) => {
    switch (model) {
      case 'gpt-4': return 'bg-blue-500';
      case 'claude-3': return 'bg-purple-500';
      case 'gemini': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-8">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            NFT Marketplace
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Trade verified AI-generated content as NFTs on Flare Network
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search NFTs by name, description, or prompt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
            
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="all">All Models</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All NFTs ({nfts.length})</TabsTrigger>
            <TabsTrigger value="for-sale">For Sale ({nfts.filter(n => n.isForSale).length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({nfts.filter(n => n.verificationData.verified).length})</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-8">
            {filteredNFTs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Store className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {searchTerm || filterModel !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'No NFTs are currently available in this category'}
                  </p>
                  <Button onClick={() => {
                    setSearchTerm('');
                    setFilterModel('all');
                    setPriceRange({ min: '', max: '' });
                  }}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNFTs.map((nft, index) => (
                  <motion.div
                    key={nft.tokenId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                      {/* NFT Image/Preview */}
                      <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 relative overflow-hidden">
                        {nft.image ? (
                          <img 
                            src={nft.image} 
                            alt={nft.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Trophy className="h-16 w-16 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm font-medium">Verified AI Content</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button variant="secondary" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleLikeNFT(nft.tokenId)}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Verification Badge */}
                        {nft.verificationData.verified && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-green-500 text-white">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                        )}

                        {/* For Sale Badge */}
                        {nft.isForSale && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="default">
                              For Sale
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        {/* Title and Model */}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg truncate flex-1">{nft.name}</h3>
                          <div className={`w-3 h-3 rounded-full ${getModelBadgeColor(nft.verificationData.model)} ml-2 flex-shrink-0`} />
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                          {nft.description}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {nft.views}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {nft.likes}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {nft.verificationData.confidence.toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Price and Action */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              {formatPrice(nft.price)}
                            </p>
                            {nft.lastSale && (
                              <p className="text-xs text-slate-500">
                                Last: {formatPrice(nft.lastSale.price)}
                              </p>
                            )}
                          </div>
                          
                          {nft.isForSale ? (
                            <Button 
                              onClick={() => handleBuyNFT(nft)}
                              size="sm"
                              className="ml-2"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Buy Now
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                        
                        {/* Metadata Preview */}
                        <div className="mt-3 pt-3 border-t text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Model:</span>
                            <span className="font-medium capitalize">{nft.verificationData.model}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-slate-500">Created:</span>
                            <span className="font-medium">
                              {new Date(nft.verificationData.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Featured Collections */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Featured Collections
            </CardTitle>
            <CardDescription>
              Curated collections of verified AI content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'AI Poetry Genesis', count: 25, volume: '45.2 FLR' },
                { name: 'Sci-Fi Stories', count: 18, volume: '32.8 FLR' },
                { name: 'Creative Writing', count: 42, volume: '78.5 FLR' }
              ].map((collection, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="font-semibold mb-2">{collection.name}</h4>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{collection.count} items</span>
                    <span>{collection.volume} volume</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Collection
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NFTMarketplacePage;
