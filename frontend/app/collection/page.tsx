'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle, 
  ExternalLink,
  Copy,
  Image,
  FileText,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { nftApi, verificationApi } from '@/lib/api/client';
import { APP_CONFIG } from '@/lib/config';

interface NFTMetadata {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  verificationData: {
    prompt: string;
    model: string;
    outputHash: string;
    timestamp: number;
    verified: boolean;
    confidence?: number;
  };
}

interface VerificationRecord {
  id: string;
  requestId: string;
  prompt: string;
  model: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  verified?: boolean;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

const CollectionPage = () => {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('nfts');

  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    }
  }, [isConnected, address]);

  const loadUserData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Load user's NFTs
      const nftResponse = await nftApi.getUserNFTs(address);
      if (nftResponse.success && nftResponse.data) {
        setNfts(nftResponse.data);
      }

      // Load user's verification history
      const verificationResponse = await verificationApi.getUserVerifications(address, {
        page: 1,
        limit: 50
      });
      if (verificationResponse.success && verificationResponse.data) {
        setVerifications(verificationResponse.data.verifications);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNfts = nfts.filter(nft => 
    nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.verificationData.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.verificationData.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVerifications = verifications.filter(verification => {
    const matchesSearch = verification.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || verification.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (tokenId: string) => {
    const explorerUrl = `${APP_CONFIG.blockchain.explorerUrl}/token/${APP_CONFIG.contracts.veriAINFT}?a=${tokenId}`;
    window.open(explorerUrl, '_blank');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Connect your wallet to view your verification NFTs and history
            </p>
            <Button className="w-full">Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            My Collection
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Your verified AI content and verification history
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              placeholder="Search by prompt, model, or NFT name..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nfts" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Verification NFTs ({nfts.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              History ({verifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nfts" className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNfts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {searchTerm ? 'No NFTs match your search criteria.' : 'You haven\'t earned any verification NFTs yet.'}
                  </p>
                  <Button onClick={() => window.location.href = '/verify'}>
                    Start Verifying Content
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNfts.map((nft, index) => (
                  <motion.div
                    key={nft.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                        {nft.image ? (
                          <img 
                            src={nft.image} 
                            alt={nft.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Verification NFT</p>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg truncate">{nft.name}</h3>
                          <Badge variant={nft.verificationData.verified ? "default" : "secondary"}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                          {nft.description}
                        </p>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Model:</span>
                            <span className="font-medium">{nft.verificationData.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-medium">
                              {new Date(nft.verificationData.timestamp * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          {nft.verificationData.confidence && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Confidence:</span>
                              <span className="font-medium">{nft.verificationData.confidence}%</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(nft.verificationData.outputHash)}
                            className="flex-1"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Hash
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInExplorer(nft.tokenId)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                          <p className="font-medium mb-1">Prompt Preview:</p>
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                            {nft.verificationData.prompt}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-3/4" />
                      <div className="flex gap-4">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVerifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Verification History</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'No verifications match your criteria.' 
                      : 'You haven\'t requested any verifications yet.'}
                  </p>
                  <Button onClick={() => window.location.href = '/verify'}>
                    Start Your First Verification
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredVerifications.map((verification, index) => (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                Verification #{verification.id.slice(0, 8)}...
                              </h3>
                              <Badge 
                                variant={
                                  verification.status === 'completed' ? 'default' :
                                  verification.status === 'processing' ? 'secondary' :
                                  verification.status === 'failed' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {verification.status}
                              </Badge>
                              {verification.verified && (
                                <Badge variant="default">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mb-3">
                              {verification.prompt}
                            </p>
                          </div>
                          <div className="text-right text-sm text-slate-500">
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(verification.createdAt).toLocaleDateString()}
                            </div>
                            <div>{new Date(verification.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 block">Model</span>
                            <span className="font-medium">{verification.model}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Status</span>
                            <span className="font-medium capitalize">{verification.status}</span>
                          </div>
                          {verification.confidence && (
                            <div>
                              <span className="text-slate-500 block">Confidence</span>
                              <span className="font-medium">{verification.confidence}%</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500 block">Updated</span>
                            <span className="font-medium">
                              {new Date(verification.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {verification.status === 'completed' && verification.verified && (
                          <div className="mt-4 flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard(verification.requestId)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Request ID
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.location.href = `/verify?request=${verification.requestId}`}
                            >
                              View Details
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CollectionPage;
