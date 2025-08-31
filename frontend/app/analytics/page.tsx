'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Activity,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { verificationApi, aiApi } from '@/lib/api/client';

interface AnalyticsData {
  totalVerifications: number;
  completedVerifications: number;
  pendingVerifications: number;
  failedVerifications: number;
  averageConfidence: number;
  totalUsers: number;
  activeUsers: number;
  verificationsByDay: Array<{
    date: string;
    count: number;
    verified: number;
  }>;
  modelUsage: Array<{
    model: string;
    count: number;
    percentage: number;
  }>;
  confidenceDistribution: Array<{
    range: string;
    count: number;
  }>;
}

interface UserStats {
  totalRequests: number;
  verifiedRequests: number;
  averageConfidence: number;
  favoriteModel: string;
  recentActivity: Array<{
    date: string;
    action: string;
    status: string;
  }>;
}

const AnalyticsPage = () => {
  const { address, isConnected } = useAccount();
  const [globalData, setGlobalData] = useState<AnalyticsData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, address]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load global statistics
      const globalResponse = await verificationApi.getStats();
      if (globalResponse.success && globalResponse.data) {
        setGlobalData(globalResponse.data);
      }

      // Load user-specific statistics if connected
      if (isConnected && address) {
        const userResponse = await verificationApi.getUserVerifications(address, {
          page: 1,
          limit: 100
        });
        if (userResponse.success && userResponse.data) {
          // Process user statistics
          const verifications = userResponse.data.verifications;
          const stats: UserStats = {
            totalRequests: verifications.length,
            verifiedRequests: verifications.filter(v => v.verified).length,
            averageConfidence: verifications.reduce((acc, v) => acc + (v.confidence || 0), 0) / verifications.length,
            favoriteModel: getMostUsedModel(verifications),
            recentActivity: verifications.slice(0, 10).map(v => ({
              date: v.createdAt,
              action: 'Verification Request',
              status: v.status
            }))
          };
          setUserStats(stats);
        }
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMostUsedModel = (verifications: any[]) => {
    const modelCounts: Record<string, number> = {};
    verifications.forEach(v => {
      modelCounts[v.model] = (modelCounts[v.model] || 0) + 1;
    });
    return Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: number;
    color?: string;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-8">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 mx-auto animate-pulse" />
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Insights into AI content verification trends and performance
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {[
              { label: '24h', value: '1d' },
              { label: '7 days', value: '7d' },
              { label: '30 days', value: '30d' },
              { label: '90 days', value: '90d' }
            ].map(({ label, value }) => (
              <Button
                key={value}
                variant={timeRange === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Verification Metrics</TabsTrigger>
            <TabsTrigger value="personal" disabled={!isConnected}>
              Personal Stats {!isConnected && '(Connect Wallet)'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            {/* Global Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Verifications"
                value={formatNumber(globalData?.totalVerifications || 0)}
                subtitle="All time"
                icon={BarChart3}
                trend={12.5}
                color="bg-blue-500"
              />
              <StatCard
                title="Completed Today"
                value={formatNumber(globalData?.completedVerifications || 0)}
                subtitle="Successfully verified"
                icon={CheckCircle}
                trend={8.2}
                color="bg-green-500"
              />
              <StatCard
                title="Active Users"
                value={formatNumber(globalData?.activeUsers || 0)}
                subtitle="Last 24 hours"
                icon={Users}
                trend={-2.1}
                color="bg-purple-500"
              />
              <StatCard
                title="Avg Confidence"
                value={`${(globalData?.averageConfidence || 0).toFixed(1)}%`}
                subtitle="Verification accuracy"
                icon={Shield}
                trend={3.7}
                color="bg-orange-500"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Verification Activity
                  </CardTitle>
                  <CardDescription>Daily verification requests over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Chart visualization would go here</p>
                      <p className="text-sm">Integration with chart library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Model Usage Distribution
                  </CardTitle>
                  <CardDescription>Most popular AI models for verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {globalData?.modelUsage?.map((model, index) => (
                      <div key={model.model} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-purple-500' : 'bg-slate-400'
                          }`} />
                          <span className="font-medium">{model.model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">{model.count}</span>
                          <Badge variant="outline">{model.percentage.toFixed(1)}%</Badge>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-slate-500">
                        <Zap className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        <p>No model usage data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-600">{globalData?.completedVerifications || 0}</h3>
                  <p className="text-slate-600 dark:text-slate-300">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-yellow-600">{globalData?.pendingVerifications || 0}</h3>
                  <p className="text-slate-600 dark:text-slate-300">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-red-600">{globalData?.failedVerifications || 0}</h3>
                  <p className="text-slate-600 dark:text-slate-300">Failed</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="verification" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Confidence Score Distribution</CardTitle>
                  <CardDescription>How confident our AI detection is</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {globalData?.confidenceDistribution?.map((range, index) => (
                      <div key={range.range} className="flex items-center justify-between">
                        <span className="font-medium">{range.range}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ 
                                width: `${(range.count / (globalData?.totalVerifications || 1)) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-slate-600 w-12">{range.count}</span>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-slate-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        <p>No confidence data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>System performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Success Rate</span>
                        <span className="text-sm text-slate-600">
                          {globalData ? 
                            ((globalData.completedVerifications / globalData.totalVerifications) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ 
                            width: globalData ? 
                              `${(globalData.completedVerifications / globalData.totalVerifications) * 100}%` : 
                              '0%'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Average Accuracy</span>
                        <span className="text-sm text-slate-600">
                          {(globalData?.averageConfidence || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${globalData?.averageConfidence || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatNumber(globalData?.totalUsers || 0)}
                        </p>
                        <p className="text-sm text-slate-600">Total Users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatNumber(globalData?.activeUsers || 0)}
                        </p>
                        <p className="text-sm text-slate-600">Active Users</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="personal" className="mt-8">
            {!isConnected ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Connect your wallet to view your personal verification statistics
                  </p>
                  <Button>Connect Wallet</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Personal Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Requests"
                    value={userStats?.totalRequests || 0}
                    icon={BarChart3}
                    color="bg-blue-500"
                  />
                  <StatCard
                    title="Verified"
                    value={userStats?.verifiedRequests || 0}
                    subtitle={`${userStats ? ((userStats.verifiedRequests / userStats.totalRequests) * 100).toFixed(1) : 0}% success rate`}
                    icon={CheckCircle}
                    color="bg-green-500"
                  />
                  <StatCard
                    title="Avg Confidence"
                    value={`${(userStats?.averageConfidence || 0).toFixed(1)}%`}
                    icon={Shield}
                    color="bg-purple-500"
                  />
                  <StatCard
                    title="Favorite Model"
                    value={userStats?.favoriteModel || 'N/A'}
                    icon={Zap}
                    color="bg-orange-500"
                  />
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Your latest verification requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userStats?.recentActivity?.length ? (
                      <div className="space-y-3">
                        {userStats.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span className="font-medium">{activity.action}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                activity.status === 'completed' ? 'default' :
                                activity.status === 'pending' ? 'secondary' :
                                'destructive'
                              }>
                                {activity.status}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                {new Date(activity.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsPage;
