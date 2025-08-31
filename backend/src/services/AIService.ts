import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'crypto';
import { logger } from '@/utils/logger';
import { DatabaseService } from './DatabaseService';

interface GenerateContentParams {
  prompt: string;
  model: string;
  userAddress: string;
  maxTokens?: number;
  temperature?: number;
}

interface ValidateOutputParams {
  prompt: string;
  output: string;
  model: string;
  expectedHash: string;
}

interface AIGeneration {
  id: string;
  requestId: string;
  prompt: string;
  output: string;
  model: string;
  userAddress: string;
  outputHash: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini';
  description: string;
  maxTokens: number;
  costPer1KTokens: number;
  available: boolean;
}

export class AIService {
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private db: DatabaseService;

  constructor() {
    // Only initialize if API keys are provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    this.db = new DatabaseService();
  }

  /**
   * Generate AI content using specified model
   */
  async generateContent(params: GenerateContentParams): Promise<AIGeneration> {
    const { prompt, model, userAddress, maxTokens = 1000, temperature = 0.7 } = params;
    
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    try {
      // Store initial request
      const generation: AIGeneration = {
        id: requestId,
        requestId,
        prompt,
        output: '',
        model,
        userAddress,
        outputHash: '',
        timestamp,
        status: 'pending',
        metadata: {
          maxTokens,
          temperature,
        },
      };

      await this.db.saveGeneration(generation);

      let output: string;
      
      if (model.startsWith('gpt-')) {
        if (!this.openai) {
          throw new Error('OpenAI API key not configured');
        }
        output = await this.generateWithOpenAI(prompt, model, maxTokens, temperature);
      } else if (model.startsWith('gemini-')) {
        if (!this.gemini) {
          throw new Error('Gemini API key not configured');
        }
        output = await this.generateWithGemini(prompt, model, maxTokens, temperature);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      const outputHash = this.hashOutput(output);

      // Update generation with results
      const completedGeneration: AIGeneration = {
        ...generation,
        output,
        outputHash,
        status: 'completed',
        metadata: {
          ...generation.metadata,
          completedAt: new Date().toISOString(),
        },
      };

      await this.db.updateGeneration(requestId, completedGeneration);

      logger.info('AI content generated', {
        requestId,
        model,
        outputLength: output.length,
        userAddress,
      });

      return completedGeneration;
    } catch (error) {
      // Update generation with error status
      await this.db.updateGeneration(requestId, {
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
      });

      logger.error('Failed to generate AI content', {
        requestId,
        model,
        userAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Generate content using OpenAI
   */
  private async generateWithOpenAI(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate content using Gemini
   */
  private async generateWithGemini(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized');
    }

    const geminiModel = this.gemini.getGenerativeModel({ 
      model: model.replace('gemini-', 'gemini-'),
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text() || '';
  }

  /**
   * Get available AI models
   */
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        description: 'Most capable GPT-4 model',
        maxTokens: 4096,
        costPer1KTokens: 0.03,
        available: !!process.env.OPENAI_API_KEY,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        description: 'Fast and efficient model',
        maxTokens: 4096,
        costPer1KTokens: 0.002,
        available: !!process.env.OPENAI_API_KEY,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        description: 'Fast and efficient Gemini model',
        maxTokens: 8192,
        costPer1KTokens: 0.001,
        available: !!process.env.GEMINI_API_KEY,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        description: 'Most capable Gemini model',
        maxTokens: 32768,
        costPer1KTokens: 0.007,
        available: !!process.env.GEMINI_API_KEY,
      },
    ];
  }

  /**
   * Get generation by request ID
   */
  async getGeneration(requestId: string): Promise<AIGeneration | null> {
    return this.db.getGeneration(requestId);
  }

  /**
   * Validate AI output against expected hash
   */
  async validateOutput(params: ValidateOutputParams): Promise<boolean> {
    const { output, expectedHash } = params;
    const actualHash = this.hashOutput(output);
    
    return actualHash === expectedHash;
  }

  /**
   * Hash AI output for verification
   */
  private hashOutput(output: string): string {
    return createHash('sha256').update(output).digest('hex');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user's generation history
   */
  async getUserGenerations(
    userAddress: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    generations: AIGeneration[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.db.getUserGenerations(userAddress, page, limit);
  }

  /**
   * Get generation statistics
   */
  async getStats(): Promise<{
    totalGenerations: number;
    totalUsers: number;
    modelUsage: Record<string, number>;
    successRate: number;
  }> {
    return this.db.getGenerationStats();
  }
}
