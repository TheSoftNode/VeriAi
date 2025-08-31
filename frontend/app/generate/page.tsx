'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  History,
  Wand2,
  Clock,
  FileText,
  Shield,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { aiApi, verificationApi } from '@/lib/api/client';
import { AI_MODELS } from '@/lib/config';

interface GenerationRequest {
  id: string;
  prompt: string;
  model: string;
  output?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    tokens: number;
    cost: number;
    processingTime: number;
  };
  createdAt: string;
  canVerify?: boolean;
}

const GeneratePage = () => {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [maxTokens, setMaxTokens] = useState([1000]);
  const [temperature, setTemperature] = useState([0.7]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<GenerationRequest[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationRequest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadGenerationHistory();
    }
  }, [isConnected, address]);

  const loadGenerationHistory = async () => {
    // This would load user's generation history
    // For now, we'll use mock data since the exact endpoint structure isn't clear
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      setGenerations([]);
    } catch (error) {
      console.error('Error loading generation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !isConnected || !address) return;

    setIsGenerating(true);
    try {
      const response = await aiApi.generateContent({
        prompt: prompt.trim(),
        model: selectedModel,
        userAddress: address,
        maxTokens: maxTokens[0],
        temperature: temperature[0],
      });

      if (response.success && response.data) {
        setCurrentGeneration(response.data);
        
        // Poll for completion
        const pollGeneration = async () => {
          const statusResponse = await aiApi.getGeneration(response.data!.id);
          if (statusResponse.success && statusResponse.data) {
            const generation = statusResponse.data;
            setCurrentGeneration(generation);
            
            if (generation.status === 'completed') {
              setIsGenerating(false);
              setGenerations(prev => [generation, ...prev]);
            } else if (generation.status === 'failed') {
              setIsGenerating(false);
              setCurrentGeneration({
                ...generation,
                output: 'Generation failed. Please try again.'
              });
            } else {
              setTimeout(pollGeneration, 2000);
            }
          }
        };
        
        pollGeneration();
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setCurrentGeneration({
        id: 'error',
        prompt,
        model: selectedModel,
        output: 'Generation failed. Please try again.',
        status: 'failed',
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleVerifyGeneration = async (generation: GenerationRequest) => {
    if (!generation.output || !address) return;

    try {
      const response = await verificationApi.requestVerification({
        prompt: generation.prompt,
        model: generation.model,
        userAddress: address,
        output: generation.output,
      });

      if (response.success) {
        // Redirect to verify page with the request ID
        window.location.href = `/verify?request=${response.data?.id}`;
      } else {
        alert('Failed to start verification: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to start verification');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadOutput = (generation: GenerationRequest) => {
    if (!generation.output) return;
    
    const blob = new Blob([generation.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-generation-${generation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Wand2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Connect your wallet to start generating AI content
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
            AI Content Generator
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Generate AI content and verify its authenticity on-chain
          </p>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Generation Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      Generate AI Content
                    </CardTitle>
                    <CardDescription>
                      Create AI-generated content with verifiable authenticity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Prompt Input */}
                    <div>
                      <Label htmlFor="prompt" className="text-base font-medium">Prompt</Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe what you want the AI to generate..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-32 mt-2"
                        maxLength={2000}
                      />
                      <div className="flex justify-between text-sm text-slate-500 mt-1">
                        <span>Be specific and detailed for better results</span>
                        <span>{prompt.length}/2000</span>
                      </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <Label className="text-base font-medium">AI Model</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {AI_MODELS.map((model) => (
                          <div
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                              selectedModel === model.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{model.name}</h3>
                              <Badge variant="outline">{model.provider}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {model.id === 'gpt-4' && 'Most advanced, higher quality responses'}
                              {model.id === 'gpt-3.5-turbo' && 'Fast and efficient, good for most tasks'}
                              {model.id === 'claude-3' && 'Great for analysis and reasoning'}
                              {model.id === 'claude-3-haiku' && 'Fast and cost-effective'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Settings className="h-4 w-4" />
                        <Label className="text-base font-medium">Advanced Settings</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium">Max Tokens: {maxTokens[0]}</Label>
                          <Slider
                            value={maxTokens}
                            onValueChange={setMaxTokens}
                            max={4000}
                            min={100}
                            step={100}
                            className="mt-2"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Maximum length of generated content
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Temperature: {temperature[0]}</Label>
                          <Slider
                            value={temperature}
                            onValueChange={setTemperature}
                            max={2}
                            min={0}
                            step={0.1}
                            className="mt-2"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Creativity level (0 = conservative, 2 = creative)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Content
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Output Section */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generated Output
                    </CardTitle>
                    <CardDescription>
                      AI-generated content will appear here
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!currentGeneration && !isGenerating && (
                      <div className="text-center py-12 text-slate-500">
                        <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p>Enter a prompt and click generate to see AI output</p>
                      </div>
                    )}

                    {isGenerating && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                        <p className="text-slate-600 mb-2">Generating content...</p>
                        <p className="text-sm text-slate-500">This may take a few moments</p>
                      </motion.div>
                    )}

                    {currentGeneration && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <Badge variant={
                            currentGeneration.status === 'completed' ? 'default' :
                            currentGeneration.status === 'processing' ? 'secondary' :
                            currentGeneration.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {currentGeneration.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                            {currentGeneration.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {currentGeneration.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {currentGeneration.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(currentGeneration.createdAt).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Output */}
                        {currentGeneration.output && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <div className="max-h-96 overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap">{currentGeneration.output}</p>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {currentGeneration.metadata && (
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Tokens:</span>
                              <span>{currentGeneration.metadata.tokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Processing Time:</span>
                              <span>{currentGeneration.metadata.processingTime}ms</span>
                            </div>
                            {currentGeneration.metadata.cost > 0 && (
                              <div className="flex justify-between">
                                <span>Cost:</span>
                                <span>${currentGeneration.metadata.cost.toFixed(4)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {currentGeneration.status === 'completed' && currentGeneration.output && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(currentGeneration.output!)}
                              className="flex-1"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadOutput(currentGeneration)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Verification */}
                        {currentGeneration.status === 'completed' && currentGeneration.output && (
                          <div className="border-t pt-4">
                            <Button
                              onClick={() => handleVerifyGeneration(currentGeneration)}
                              className="w-full"
                              variant="default"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Verify Authenticity On-Chain
                            </Button>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                              Create immutable proof of AI generation
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-3/4" />
                      <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : generations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Generation History</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    You haven't generated any AI content yet.
                  </p>
                  <Button onClick={() => (document.querySelector('[value="generate"]') as HTMLElement)?.click()}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Generating
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {generations.map((generation, index) => (
                  <motion.div
                    key={generation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                Generation #{generation.id.slice(0, 8)}...
                              </h3>
                              <Badge variant={
                                generation.status === 'completed' ? 'default' :
                                generation.status === 'failed' ? 'destructive' :
                                'secondary'
                              }>
                                {generation.status}
                              </Badge>
                              <Badge variant="outline">{generation.model}</Badge>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                              {generation.prompt}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(generation.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {generation.output && (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
                            <p className="text-sm line-clamp-4">{generation.output}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentGeneration(generation)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View Full
                          </Button>
                          {generation.output && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(generation.output!)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerifyGeneration(generation)}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Verify
                              </Button>
                            </>
                          )}
                        </div>
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

export default GeneratePage;
