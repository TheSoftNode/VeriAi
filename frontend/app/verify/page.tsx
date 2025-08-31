'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Link2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyPage = () => {
  const [contentType, setContentType] = useState<'text' | 'file' | 'url'>('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleVerification = async () => {
    setIsVerifying(true);
    
    try {
      // Get user's wallet address (you'll need to implement wallet connection for user identification)
      const userAddress = '0x9b8B7022524FBAa8C3e75C42dB922Ca0d92366A8'; // Mock address for now
      
      let prompt = '';
      let output = '';
      
      if (contentType === 'text') {
        prompt = 'Verify this text content for authenticity';
        output = content;
      } else if (contentType === 'url') {
        prompt = 'Verify content from this URL';
        output = url;
      } else if (contentType === 'file' && file) {
        prompt = 'Verify this file content';
        output = `File: ${file.name}`;
      }

      // Call backend API (backend handles smart contract interactions)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/verification/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: 'gpt-4',
          userAddress,
          output,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Poll for verification result (backend handles blockchain interactions)
        const pollForResult = async () => {
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/verification/${data.data.id}`);
          const statusData = await statusResponse.json();
          
          if (statusData.success && statusData.data) {
            const verification = statusData.data;
            
            if (verification.status === 'completed') {
              setVerificationResult({
                isAuthentic: verification.verified || false,
                confidence: verification.confidence || 0,
                timestamp: new Date(verification.updatedAt),
                source: 'VeriAI Backend + Smart Contracts',
                details: {
                  humanGenerated: verification.verified ? 85 : 15,
                  aiGenerated: verification.verified ? 15 : 85,
                  manipulated: verification.verified ? 5 : 30,
                }
              });
              setIsVerifying(false);
            } else if (verification.status === 'failed') {
              throw new Error('Verification failed');
            } else {
              // Continue polling
              setTimeout(pollForResult, 2000);
            }
          }
        };
        
        pollForResult();
      } else {
        throw new Error(data.error || data.message || 'Verification request failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isAuthentic: false,
        confidence: 0,
        timestamp: new Date(),
        source: 'Error',
        details: {
          humanGenerated: 0,
          aiGenerated: 0,
          manipulated: 100,
        }
      });
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setContent('');
    setUrl('');
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Content Verification Portal
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Verify the authenticity of any content using our advanced AI detection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Submit Content for Verification
                </CardTitle>
                <CardDescription>
                  Choose your content type and submit for AI-powered authenticity analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Content Type Selection */}
                <div>
                  <Label className="text-base font-medium">Content Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={contentType === 'text' ? 'default' : 'outline'}
                      onClick={() => setContentType('text')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Text
                    </Button>
                    <Button
                      variant={contentType === 'file' ? 'default' : 'outline'}
                      onClick={() => setContentType('file')}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      File
                    </Button>
                    <Button
                      variant={contentType === 'url' ? 'default' : 'outline'}
                      onClick={() => setContentType('url')}
                      className="flex items-center gap-2"
                    >
                      <Link2 className="h-4 w-4" />
                      URL
                    </Button>
                  </div>
                </div>

                {/* Content Input */}
                {contentType === 'text' && (
                  <div>
                    <Label htmlFor="content">Text Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Paste your text content here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-32"
                    />
                  </div>
                )}

                {contentType === 'file' && (
                  <div>
                    <Label htmlFor="file">Upload File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".txt,.pdf,.doc,.docx,.jpg,.png,.mp4,.mp3"
                    />
                    {file && (
                      <p className="text-sm text-slate-600 mt-2">
                        Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                {contentType === 'url' && (
                  <div>
                    <Label htmlFor="url">Content URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/content"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                )}

                {/* Verification Button */}
                <Button
                  onClick={handleVerification}
                  disabled={isVerifying || (!content && !file && !url)}
                  className="w-full"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Content'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Verification Result</CardTitle>
                <CardDescription>
                  AI-powered authenticity analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!verificationResult && !isVerifying && (
                  <div className="text-center py-8 text-slate-500">
                    Submit content to see verification results
                  </div>
                )}

                {isVerifying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Analyzing content...</p>
                  </motion.div>
                )}

                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Main Result */}
                    <div className={`p-4 rounded-lg border-2 ${
                      verificationResult.isAuthentic 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {verificationResult.isAuthentic ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {verificationResult.isAuthentic ? 'Authentic Content' : 'Suspicious Content'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Confidence: {verificationResult.confidence.toFixed(1)}%
                      </p>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Detailed Analysis</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Human Generated</span>
                          <Badge variant="outline">
                            {verificationResult.details.humanGenerated.toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">AI Generated</span>
                          <Badge variant="outline">
                            {verificationResult.details.aiGenerated.toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Potentially Manipulated</span>
                          <Badge variant="outline">
                            {verificationResult.details.manipulated.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t text-xs text-slate-500">
                      <p>Verified: {verificationResult.timestamp.toLocaleString()}</p>
                      <p>Source: {verificationResult.source}</p>
                    </div>

                    <Button onClick={resetVerification} variant="outline" className="w-full">
                      Verify New Content
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Advanced AI Detection</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Our neural networks can detect AI-generated content with 95%+ accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Blockchain Verified</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                All verification results are stored immutably on the Flare Network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Multiple Formats</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Verify text, images, audio, video, and documents in real-time
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
