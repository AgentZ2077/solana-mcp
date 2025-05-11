// src/core/mcp.js - Model Context Protocol implementation

import { z } from 'zod';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from './logger.js';
import { ToolError } from './error.js';
import { tools } from './toolRegistry.js';

/**
 * MCP (Model Context Protocol) provides a standardized interface 
 * for AI models to interact with blockchain data
 */
export class MCPProtocol {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.cluster - Solana cluster to connect to ('devnet', 'mainnet-beta', etc.)
   * @param {number} options.timeoutMs - Default timeout for operations in milliseconds
   */
  constructor(options = {}) {
    this.config = {
      cluster: options.cluster || 'devnet',
      timeoutMs: options.timeoutMs || 30000,
      maxBatchSize: options.maxBatchSize || 5,
      contextFormat: options.contextFormat || 'json'
    };

    // Initialize Solana connection
    this.connection = new Connection(
      this.config.cluster === 'devnet' 
        ? 'https://api.devnet.solana.com' 
        : (this.config.cluster === 'mainnet-beta' 
          ? 'https://api.mainnet-beta.solana.com' 
          : this.config.cluster)
    );
    
    logger.info('MCP Protocol initialized with config:', this.config);
  }
  
  /**
   * Schema for validating MCP requests
   */
  static requestSchema = z.object({
    tool: z.string(),
    params: z.record(z.any()),
    options: z.object({
      timeout: z.number().optional(),
      simulate: z.boolean().optional(),
      priority: z.enum(['high', 'normal', 'low']).optional()
    }).optional()
  });
  
  /**
   * Schema for validating batch requests
   */
  static batchRequestSchema = z.object({
    operations: z.array(MCPProtocol.requestSchema),
    options: z.object({
      abortOnError: z.boolean().optional(),
      parallel: z.boolean().optional()
    }).optional()
  });

  /**
   * Process a single MCP request
   * @param {Object} request - MCP request object
   * @param {string} request.tool - Tool name to execute
   * @param {Object} request.params - Parameters for the tool
   * @param {Object} [request.options] - Optional execution options
   * @returns {Promise<Object>} - Result of the operation
   */
  async processRequest(request) {
    try {
      // Validate request format
      const { tool: toolName, params, options = {} } = MCPProtocol.requestSchema.parse(request);
      
      // Get the tool implementation
      const tool = tools[toolName];
      if (!tool) {
        throw new ToolError('TOOL_NOT_FOUND', `Tool "${toolName}" not found`);
      }
      
      // Set up execution context and timeout
      const timeout = options.timeout || this.config.timeoutMs;
      
      // Simulate if requested
      if (options.simulate && tool.simulate) {
        const simulationResult = await tool.simulate(params, this.connection);
        if (!simulationResult.success) {
          return {
            success: false,
            error: {
              code: 'SIMULATION_FAILED',
              message: simulationResult.reason
            },
            simulationResult
          };
        }
      }
      
      // Execute the tool with timeout
      const result = await Promise.race([
        tool.run(params, this.connection),
        new Promise((_, reject) => 
          setTimeout(() => reject(new ToolError('TIMEOUT', 'Operation timed out')), timeout)
        )
      ]);
      
      return {
        success: true,
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('MCP request processing error:', error);
      
      return {
        success: false,
        error: {
          code: error instanceof ToolError ? error.code : 'REQUEST_ERROR',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Process multiple MCP requests as a batch
   * @param {Object} batchRequest - Batch request object
   * @param {Array} batchRequest.operations - Array of MCP request objects
   * @param {Object} batchRequest.options - Batch execution options
   * @returns {Promise<Array>} - Array of operation results
   */
  async processBatch(batchRequest) {
    try {
      const { operations, options = {} } = MCPProtocol.batchRequestSchema.parse(batchRequest);
      
      if (operations.length > this.config.maxBatchSize) {
        throw new ToolError('BATCH_TOO_LARGE', 
          `Batch size ${operations.length} exceeds maximum allowed (${this.config.maxBatchSize})`);
      }
      
      const results = [];
      
      // Process sequentially or in parallel based on options
      if (options.parallel) {
        const promises = operations.map(op => this.processRequest(op));
        const parallelResults = await Promise.all(promises);
        return parallelResults;
      } else {
        // Process sequentially
        for (const operation of operations) {
          const result = await this.processRequest(operation);
          results.push(result);
          
          // If configured to abort on error and an error occurred
          if (options.abortOnError && !result.success) {
            break;
          } 
        }
      }
      
      return results;
      
    } catch (error) {
      logger.error('MCP batch processing error:', error);
      
      return {
        success: false,
        error: {
          code: error instanceof ToolError ? error.code : 'BATCH_ERROR',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Translates blockchain data into AI-readable context
   * @param {Object} blockchainData - Raw blockchain data
   * @returns {Object} - Processed context information
   */
  translateToContext(blockchainData) {
    // Transform blockchain data into a format suitable for AI consumption
    const context = {};
    
    // Process account data
    if (blockchainData.accounts) {
      context.accounts = blockchainData.accounts.map(account => ({
        address: account.pubkey.toString(),
        lamports: account.account.lamports,
        owner: account.account.owner.toString(),
        executable: account.account.executable,
        rentEpoch: account.account.rentEpoch,
        dataSize: account.account.data.length
      }));
    }
    
    // Process transaction data
    if (blockchainData.transactions) {
      context.transactions = blockchainData.transactions.map(tx => ({
        signature: tx.transaction.signatures[0],
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : undefined,
        success: tx.meta?.err === null,
        fee: tx.meta?.fee || 0,
        instructions: tx.transaction.message.instructions.length
      }));
    }
    
    // Process NFT metadata if present
    if (blockchainData.nfts) {
      context.nfts = blockchainData.nfts.map(nft => ({
        mint: nft.mint,
        name: nft.data.name,
        symbol: nft.data.symbol,
        uri: nft.data.uri,
        sellerFeeBasisPoints: nft.data.sellerFeeBasisPoints
      }));
    }
    
    // Add additional game-specific context transformations
    if (blockchainData.playerState) {
      context.player = {
        address: blockchainData.playerState.pubkey.toString(),
        name: blockchainData.playerState.account.name,
        level: blockchainData.playerState.account.level,
        owner: blockchainData.playerState.account.owner.toString()
      };
    }
    
    return context;
  }
  
  /**
   * Fetches blockchain data and converts it to AI-readable context
   * @param {Object} params - Parameters for context fetching
   * @param {Array<string>} params.accounts - Account addresses to fetch
   * @param {Array<string>} params.transactions - Transaction signatures to fetch 
   * @param {string} params.player - Player account address to fetch
   * @returns {Promise<Object>} - AI-readable context
   */
  async fetchContext({ accounts = [], transactions = [], player }) {
    const blockchainData = {};
    
    // Fetch accounts
    if (accounts.length > 0) {
      const accountKeys = accounts.map(acc => new PublicKey(acc));
      blockchainData.accounts = await this.connection.getMultipleAccountsInfo(accountKeys);
    }
    
    // Fetch transactions
    if (transactions.length > 0) {
      const txPromises = transactions.map(sig => 
        this.connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 })
      );
      blockchainData.transactions = await Promise.all(txPromises);
    }
    
    // Fetch player state if requested
    if (player) {
      try {
        const playerPubkey = new PublicKey(player);
        const playerAccountInfo = await this.connection.getAccountInfo(playerPubkey);
        
        if (playerAccountInfo) {
          // This assumes the player account is an Anchor account with a specific format
          // In a real application, you would use an Anchor deserializer here
          blockchainData.playerState = {
            pubkey: playerPubkey,
            account: {
              // This is simplified - real implementation would deserialize the account data
              name: "Player", // Placeholder
              level: 1, // Placeholder  
              owner: playerAccountInfo.owner
            }
          };
        }
      } catch (error) {
        logger.error('Error fetching player state:', error);
      }
    }
    
    // Translate blockchain data to context
    return this.translateToContext(blockchainData);
  }
}
