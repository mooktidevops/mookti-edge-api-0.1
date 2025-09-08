/**
 * Context Manager with Compression
 * Efficiently manages conversation context based on tool requirements
 */

import { generateText } from 'ai';
import { routeToModel } from '../../lib/ai/model-router';
import { EllenSessionStorage } from '../../lib/storage/ellen-session-storage';
import { ContextStrategy } from '../config/tool-config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export class ContextManager {
  private readonly RECENT_MESSAGES = 6;  // Keep last 3 exchanges
  private readonly SUMMARY_THRESHOLD = 10;  // Summarize after 10 messages
  private sessionStorage: EllenSessionStorage;

  constructor() {
    this.sessionStorage = new EllenSessionStorage();
  }

  /**
   * Get context based on tool's strategy
   */
  async getContext(strategy: ContextStrategy, sessionId?: string): Promise<Message[]> {
    if (!sessionId) return [];
    
    const session = await this.sessionStorage.getSession(sessionId);
    if (!session || !session.messages) return [];
    
    const messages = session.messages;
    
    switch (strategy) {
      case 'none':
        return [];
        
      case 'minimal':
        // Current exchange only (last 2 messages)
        return this.formatMessages(messages.slice(-2));
        
      case 'recent':
        // Last 3 exchanges (6 messages)
        return this.formatMessages(messages.slice(-this.RECENT_MESSAGES));
        
      case 'full':
        // Complete history with compression if needed
        if (messages.length > this.SUMMARY_THRESHOLD) {
          return await this.compressFullContext(messages);
        }
        return this.formatMessages(messages);
        
      case 'summary':
        // Summarize old, keep recent
        if (messages.length > this.SUMMARY_THRESHOLD) {
          return await this.summarizeWithRecent(messages);
        }
        return this.formatMessages(messages);
        
      case 'goals':
        // Extract just learning goals and constraints
        return await this.extractGoalsAndConstraints(messages);
        
      case 'document':
        // For future writing tutor - document-focused context
        return await this.getDocumentContext(messages);
        
      default:
        return this.formatMessages(messages.slice(-this.RECENT_MESSAGES));
    }
  }

  /**
   * Compress full context for tools that need complete history
   */
  private async compressFullContext(messages: any[]): Promise<Message[]> {
    const compressed: Message[] = [];
    
    // Always keep the first message (establishes context)
    if (messages.length > 0) {
      compressed.push(this.formatMessage(messages[0]));
    }
    
    // Compress middle messages if many
    if (messages.length > this.SUMMARY_THRESHOLD + 3) {
      const middleMessages = messages.slice(1, -this.RECENT_MESSAGES);
      const summary = await this.summarizeMessages(middleMessages, 'full');
      compressed.push({
        role: 'system',
        content: `Previous conversation summary: ${summary}`
      });
    } else {
      // Not too many, keep all middle messages
      const middleMessages = messages.slice(1, -this.RECENT_MESSAGES);
      compressed.push(...this.formatMessages(middleMessages));
    }
    
    // Keep recent messages in full detail
    compressed.push(...this.formatMessages(messages.slice(-this.RECENT_MESSAGES)));
    
    return compressed;
  }

  /**
   * Create summary of old messages + keep recent
   */
  private async summarizeWithRecent(messages: any[]): Promise<Message[]> {
    const oldMessages = messages.slice(0, -this.RECENT_MESSAGES);
    const recentMessages = messages.slice(-this.RECENT_MESSAGES);
    
    const summary = await this.summarizeMessages(oldMessages, 'concise');
    
    return [
      {
        role: 'system',
        content: `Previous context: ${summary}`
      },
      ...this.formatMessages(recentMessages)
    ];
  }

  /**
   * Extract goals and constraints from conversation
   */
  private async extractGoalsAndConstraints(messages: any[]): Promise<Message[]> {
    // Look for goal-related messages
    const goalMessages = messages.filter(msg => {
      const content = msg.content.toLowerCase();
      return content.includes('goal') || 
             content.includes('want to') || 
             content.includes('need to') ||
             content.includes('deadline') ||
             content.includes('exam') ||
             content.includes('assignment');
    });
    
    if (goalMessages.length === 0) {
      // No explicit goals, use recent context
      return this.formatMessages(messages.slice(-4));
    }
    
    // Summarize goals
    const { text } = await this.generateSummary(
      goalMessages,
      'Extract the learning goals, deadlines, and constraints mentioned. Be specific and concise.'
    );
    
    return [
      {
        role: 'system',
        content: `Learning context: ${text}`
      },
      ...this.formatMessages(messages.slice(-2))  // Plus most recent exchange
    ];
  }

  /**
   * Get document-focused context (for future writing tutor)
   */
  private async getDocumentContext(messages: any[]): Promise<Message[]> {
    // Find messages containing document content
    const documentMessages = messages.filter(msg => 
      msg.metadata?.hasDocument || 
      msg.content.length > 500  // Likely contains substantial text
    );
    
    if (documentMessages.length === 0) {
      return this.formatMessages(messages.slice(-4));
    }
    
    // Keep original document and recent revisions
    return [
      this.formatMessage(documentMessages[0]),  // Original
      ...this.formatMessages(documentMessages.slice(-2)),  // Recent revisions
      ...this.formatMessages(messages.slice(-2))  // Recent discussion
    ];
  }

  /**
   * Summarize messages using LLM
   */
  private async summarizeMessages(messages: any[], style: 'concise' | 'full'): Promise<string> {
    const prompt = style === 'concise'
      ? 'Summarize this learning conversation in 2-3 sentences. Focus on main topics and key decisions.'
      : 'Summarize this conversation, preserving important details, questions asked, and insights gained. Maximum 200 words.';
    
    const { text } = await this.generateSummary(messages, prompt);
    return text;
  }

  /**
   * Generate summary using small model
   */
  private async generateSummary(messages: any[], prompt: string): Promise<{ text: string }> {
    const { model } = routeToModel({ 
      provider: 'openai',
      tier: 1 as const  // Use smallest model for summaries
    });
    
    const formattedMessages = this.formatMessages(messages);
    
    return await generateText({
      model,
      system: prompt,
      messages: formattedMessages,
      temperature: 0.3,
      maxRetries: 200
    });
  }

  /**
   * Format messages for LLM consumption
   */
  private formatMessages(messages: any[]): Message[] {
    return messages.map(msg => this.formatMessage(msg));
  }

  private formatMessage(msg: any): Message {
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      metadata: msg.metadata
    };
  }

  /**
   * Calculate compression metrics
   */
  getCompressionMetrics(original: Message[], compressed: Message[]): {
    originalTokens: number;
    compressedTokens: number;
    compressionRatio: number;
    tokensSaved: number;
  } {
    const originalTokens = this.estimateTokens(original);
    const compressedTokens = this.estimateTokens(compressed);
    
    return {
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      tokensSaved: originalTokens - compressedTokens
    };
  }

  /**
   * Rough token estimation (4 chars ≈ 1 token)
   */
  private estimateTokens(messages: Message[]): number {
    const totalChars = messages.reduce((sum, msg) => 
      sum + msg.content.length, 0
    );
    return Math.ceil(totalChars / 4);
  }
}