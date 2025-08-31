'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Settings, 
  Activity, 
  TrendingUp, 
  Shield, 
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  ExternalLink,
  Copy,
  Download,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useVerification, useNFT } from '@/lib/hooks/useAPI';
import { APP_CONFIG } from '@/lib/config';

interface UserProfile {
  address: string;
  joinedAt: string;
  totalVerifications: number;
  verifiedContent: number;
  nftsMinted: number;
  favoriteModel: string;
  successRate: number;
  averageConfidence: number;
}

const DashboardPage = () => {
  const { address, isConnected } = useAccount();
  const { getUserVerifications, loading: verificationsLoading } = useVerification();
  const { getUserNFTs, loading: nftsLoading } = useNFT();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    thisWeek: { verifications: 0, verified: 0 },
    thisMonth: { verifications: 0, verified: 0 },
    allTime: { verifications: 0, verified: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    }
  }, [isConnected, address]);

  const loadUserData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Load user verifications
      const verificationsData = await getUserVerifications({ limit: 100 });
      const verifications = verificationsData.verifications || [];
      
      // Load user NFTs
      const nfts = await getUserNFTs();

      // Calculate user profile
      const verified = verifications.filter(v => v.verified).length;
      const models = verifications.map(v => v.model);
      const favoriteModel = models.length > 0 ? 
        models.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        ) : 'N/A';

      const profile: UserProfile = {
        address,
        joinedAt: verifications.length > 0 ? verifications[verifications.length - 1].createdAt : new Date().toISOString(),
        totalVerifications: verifications.length,
        verifiedContent: verified,
        nftsMinted: nfts.length,
        favoriteModel,
        successRate: verifications.length > 0 ? (verified / verifications.length) * 100 : 0,
        averageConfidence: verifications.reduce((acc, v) => acc + (v.confidence || 0), 0) / verifications.length || 0
      };

      setUserProfile(profile);

      // Calculate time-based stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const thisWeekVerifications = verifications.filter(v => new Date(v.createdAt) >= weekAgo);
      const thisMonthVerifications = verifications.filter(v => new Date(v.createdAt) >= monthAgo);

      setStats({
        thisWeek: {
          verifications: thisWeekVerifications.length,
          verified: thisWeekVerifications.filter(v => v.verified).length
        },
        thisMonth: {
          verifications: thisMonthVerifications.length,
          verified: thisMonthVerifications.filter(v => v.verified).length
        },
        allTime: {
          verifications: verifications.length,
          verified: verified
        }
      });

      // Set recent activity
      setRecentActivity(verifications.slice(0, 10));

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (hash: string) => {
    window.open(`${APP_CONFIG.blockchain.explorerUrl}/tx/${hash}`, '_blank');
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
    trend?: number;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color || 'bg-blue-100 dark:bg-blue-900'}`}>
            <Icon className={`h-6 w-6 ${color ? 'text-white' : 'text-blue-600'}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className={`h-4 w-4 mr-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-slate-500 ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Wallet className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Connect your wallet to access your dashboard
            </p>
            <Button className="w-full">Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-8 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto mb-4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Dashboard
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Welcome back, {userProfile?.address.slice(0, 6)}...{userProfile?.address.slice(-4)}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Verifications"
            value={userProfile?.totalVerifications || 0}
            subtitle="All time"
            icon={BarChart3}
            color="bg-blue-500"
          />
          <StatCard
            title="Verified Content"
            value={userProfile?.verifiedContent || 0}
            subtitle={`${userProfile?.successRate.toFixed(1)}% success rate`}
            icon={CheckCircle}
            color="bg-green-500"
          />
          <StatCard
            title="NFTs Earned"
            value={userProfile?.nftsMinted || 0}
            subtitle="Verification certificates"
            icon={Trophy}
            color="bg-purple-500"
          />
          <StatCard
            title="Avg Confidence"
            value={`${userProfile?.averageConfidence.toFixed(1)}%`}
            subtitle="Detection accuracy"
            icon={Shield}
            color="bg-orange-500"
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {userProfile?.address.slice(0, 6)}...{userProfile?.address.slice(-4)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Member since {userProfile?.joinedAt ? new Date(userProfile.joinedAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Favorite Model</span>
                      <Badge variant="outline">{userProfile?.favoriteModel}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Success Rate</span>
                      <span className="text-sm font-medium">{userProfile?.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total Earned</span>
                      <span className="text-sm font-medium">{userProfile?.nftsMinted} NFTs</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(address || '')}
                      className="w-full"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Address
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>Your verification activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.thisWeek.verifications}</p>
                      <p className="text-sm text-slate-600">This Week</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.thisMonth.verifications}</p>
                      <p className="text-sm text-slate-600">This Month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{stats.allTime.verifications}</p>
                      <p className="text-sm text-slate-600">All Time</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Weekly Progress</span>
                        <span className="text-sm text-slate-600">
                          {stats.thisWeek.verified}/{stats.thisWeek.verifications} verified
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ 
                            width: stats.thisWeek.verifications > 0 ? 
                              `${(stats.thisWeek.verified / stats.thisWeek.verifications) * 100}%` : 
                              '0%'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Monthly Progress</span>
                        <span className="text-sm text-slate-600">
                          {stats.thisMonth.verified}/{stats.thisMonth.verifications} verified
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ 
                            width: stats.thisMonth.verifications > 0 ? 
                              `${(stats.thisMonth.verified / stats.thisMonth.verifications) * 100}%` : 
                              '0%'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest verification requests and results</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === 'completed' ? 'bg-green-500' :
                            activity.status === 'processing' ? 'bg-yellow-500' :
                            activity.status === 'failed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">Verification Request</p>
                            <p className="text-xs text-slate-600 line-clamp-1">{activity.prompt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            activity.status === 'completed' ? 'default' :
                            activity.status === 'processing' ? 'secondary' :
                            activity.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {activity.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {activity.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                            {activity.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {activity.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate Trends</CardTitle>
                  <CardDescription>Your verification success over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Chart visualization would go here</p>
                      <p className="text-sm">Success rate: {userProfile?.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Model Usage</CardTitle>
                  <CardDescription>Your preferred AI models</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{userProfile?.favoriteModel}</span>
                      <Badge variant="default">Most Used</Badge>
                    </div>
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">Detailed model analytics would go here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Settings
                </CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Wallet Address</h3>
                    <p className="text-sm text-slate-600">{address}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(address || '')}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Network</h3>
                    <p className="text-sm text-slate-600">{APP_CONFIG.blockchain.name}</p>
                  </div>
                  <Badge variant="outline">{APP_CONFIG.blockchain.nativeCurrency.symbol}</Badge>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
