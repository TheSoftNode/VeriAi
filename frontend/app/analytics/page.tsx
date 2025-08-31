'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Download,
  RefreshCw,
  Globe,
  Target,
  Cpu,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { verificationApi, aiApi } from '@/lib/api/client';
import { useWalletActions } from '@/lib/contexts/WalletContext';
import { toast } from 'sonner';

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
  const { requireWallet } = useWalletActions();
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
      // Mock data for demonstration - replace with actual API calls
      const mockGlobalData: AnalyticsData = {
        totalVerifications: 15420,
        completedVerifications: 12835,
        pendingVerifications: 1247,
        failedVerifications: 1338,
        averageConfidence: 94.2,
        totalUsers: 8546,
        activeUsers: 2847,
        verificationsByDay: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 500) + 200,
          verified: Math.floor(Math.random() * 400) + 150
        })),
        modelUsage: [
          { model: 'GPT-4', count: 8750, percentage: 56.8 },
          { model: 'Claude 3', count: 4230, percentage: 27.4 },
          { model: 'Gemini', count: 2440, percentage: 15.8 }
        ],
        confidenceDistribution: [
          { range: '90-100%', count: 9630 },
          { range: '80-90%', count: 3850 },
          { range: '70-80%', count: 1540 },
          { range: '<70%', count: 400 }
        ]
      };

      setGlobalData(mockGlobalData);

      // Load user-specific statistics if connected
      if (isConnected && address) {
        const mockUserStats: UserStats = {
          totalRequests: 47,
          verifiedRequests: 42,
          averageConfidence: 96.3,
          favoriteModel: 'GPT-4',
          recentActivity: [
            { date: new Date().toISOString(), action: 'Content Verification', status: 'completed' },
            { date: new Date(Date.now() - 86400000).toISOString(), action: 'AI Generation', status: 'completed' },
            { date: new Date(Date.now() - 172800000).toISOString(), action: 'Content Verification', status: 'pending' }
          ]
        };
        setUserStats(mockUserStats);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
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
            Real-time insights into VeriAI platform performance
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
          <div className="flex gap-2">
            <Button onClick={loadAnalyticsData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="personal" disabled={!isConnected}>
              Personal {!isConnected && '(Connect)'}
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
                trend={23.4}
                color="bg-blue-500"
              />
              <StatCard
                title="Completed"
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
                      <p className="text-sm">Showing {globalData?.verificationsByDay?.length || 0} days of data</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                      <Progress 
                        value={globalData ? 
                          (globalData.completedVerifications / globalData.totalVerifications) * 100 : 
                          0
                        } 
                        className="h-2" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Average Accuracy</span>
                        <span className="text-sm text-slate-600">
                          {(globalData?.averageConfidence || 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={globalData?.averageConfidence || 0} 
                        className="h-2" 
                      />
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
            
            {/* Additional verification metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {globalData ? ((globalData.completedVerifications / globalData.totalVerifications) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-sm text-slate-600">Success Rate</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">2.3s</p>
                  <p className="text-sm text-slate-600">Avg Processing Time</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{(globalData?.averageConfidence || 0).toFixed(1)}%</p>
                  <p className="text-sm text-slate-600">Avg Confidence</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">12</p>
                  <p className="text-sm text-slate-600">Active Challenges</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="models" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Model Performance Comparison
                  </CardTitle>
                  <CardDescription>Accuracy and speed metrics by AI model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { name: 'GPT-4', accuracy: 96.8, speed: 2.1, usage: 65, color: 'bg-blue-500' },
                      { name: 'Claude 3', accuracy: 94.2, speed: 1.8, usage: 25, color: 'bg-purple-500' },
                      { name: 'Gemini', accuracy: 92.1, speed: 2.5, usage: 10, color: 'bg-green-500' }
                    ].map((model) => (
                      <div key={model.name} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${model.color}`} />
                            <span className="font-semibold">{model.name}</span>
                          </div>
                          <Badge variant="outline">{model.usage}% usage</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>Accuracy</span>
                              <span>{model.accuracy}%</span>
                            </div>
                            <Progress value={model.accuracy} className="h-1.5" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>Speed</span>
                              <span>{model.speed}s</span>
                            </div>
                            <Progress value={100 - (model.speed / 3) * 100} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Model Usage Trends
                  </CardTitle>
                  <CardDescription>Daily usage patterns for each AI model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Model usage trend chart</p>
                      <p className="text-sm">Time series visualization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Efficiency</CardTitle>
                  <CardDescription>Average cost per verification by model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>GPT-4</span>
                      <span className="font-semibold">$0.025</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Claude 3</span>
                      <span className="font-semibold">$0.018</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gemini</span>
                      <span className="font-semibold">$0.015</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>Model reliability metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>GPT-4</span>
                      <Badge variant="outline" className="text-green-600">1.2%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Claude 3</span>
                      <Badge variant="outline" className="text-green-600">2.1%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gemini</span>
                      <Badge variant="outline" className="text-yellow-600">3.8%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confidence Levels</CardTitle>
                  <CardDescription>Average confidence by model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">96.8%</p>
                      <p className="text-sm text-slate-600">GPT-4 Average</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                      <div>
                        <p className="font-semibold">94.2%</p>
                        <p className="text-slate-600">Claude 3</p>
                      </div>
                      <div>
                        <p className="font-semibold">92.1%</p>
                        <p className="text-slate-600">Gemini</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Flare Network Activity
                  </CardTitle>
                  <CardDescription>Real-time blockchain metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">45,680</p>
                      <p className="text-sm text-slate-600">Total Transactions</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">12.4M</p>
                      <p className="text-sm text-slate-600">Gas Used</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">0.025 FLR</p>
                      <p className="text-sm text-slate-600">Avg Gas Price</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">2,847,392</p>
                      <p className="text-sm text-slate-600">Block Height</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    FDC Performance
                  </CardTitle>
                  <CardDescription>Flare Data Connector metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Success Rate</span>
                        <span className="text-sm text-green-600 font-semibold">99.2%</span>
                      </div>
                      <Progress value={99.2} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Avg Response Time</span>
                        <span className="text-sm text-blue-600 font-semibold">1.8s</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Data Availability</span>
                        <span className="text-sm text-purple-600 font-semibold">99.9%</span>
                      </div>
                      <Progress value={99.9} className="h-2" />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span>Active Attestations</span>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          11,240
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Interactions</CardTitle>
                  <CardDescription>Smart contract usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>VeriAI Contract</span>
                      <span className="font-semibold">28,342</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NFT Contract</span>
                      <span className="font-semibold">8,574</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FDC Relayer</span>
                      <span className="font-semibold">12,847</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Health</CardTitle>
                  <CardDescription>Blockchain performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Network Status</span>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Block Time</span>
                      <span className="font-semibold">1.2s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TPS</span>
                      <span className="font-semibold">847</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gas Analytics</CardTitle>
                  <CardDescription>Transaction cost insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">0.025 FLR</p>
                      <p className="text-sm text-slate-600">Average Gas Price</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                      <div>
                        <p className="font-semibold">21,000</p>
                        <p className="text-slate-600">Avg Gas Limit</p>
                      </div>
                      <div>
                        <p className="font-semibold">$0.08</p>
                        <p className="text-slate-600">Avg TX Cost</p>
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
                  <Button onClick={() => requireWallet('view personal analytics')}>
                    Connect Wallet
                  </Button>
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
