// src/agentRuntime.js - Enhanced with state persistence, transaction simulation and improved lifecycle management

import { tools } from './core/toolRegistry.js';
import { memoryStore } from './core/memoryStore.js';
import { Connection } from '@solana/web3.js';
import { simulateTransaction } from './core/simulator.js';
import { logger } from './core/logger.js';
import { ToolError } from './core/error.js';
import { EventEmitter } from 'events';

/**
 * AgentRuntime represents an execution environment for AI agents,
 * handling tool permissions, execution, logging, and state persistence
 */
export class AgentRuntime extends EventEmitter {
  /**
   * @param {string} agentId - Unique identifier for this agent instance
   * @param {object} options - Configuration options
   * @param {string} options.cluster - Solana cluster to connect to (default: 'devnet')
   * @param {number} options.executionTimeout - Maximum execution time in ms (default: 30000)
   * @param {boolean} options.simulateBeforeExecute - Whether to simulate transactions before execution (default: true)
   */
  constructor(agentId, options = {}) {
    super();
    this.agentId = agentId;
    this.context = {};
    this.startTime = Date.now();
    this.status = 'initializing';
    this.stats = {
      toolsExecuted: 0,
      executionTime: 0,
      errors: 0,
      lastActivity: this.startTime
    };
    
    // Default configuration
    this.config = {
      cluster: options.cluster || 'devnet',
      executionTimeout: options.executionTimeout || 30000,
      simulateBeforeExecute: options.simulateBeforeExecute !== false,
      maxMemoryItems: options.maxMemoryItems || 100
    };
    
    // Initialize Solana connection
    this.connection = new Connection(
      this.config.cluster === 'devnet' 
        ? 'https://api.devnet.solana.com' 
        : (this.config.cluster === 'mainnet-beta' 
            ? 'https://api.mainnet-beta.solana.com' 
            : this.config.cluster)
    );
    
    logger.info(`Agent Runtime ${agentId} initialized with config:`, this.config);
    this.status = 'ready';
    this.emit('ready', { agentId, config: this.config });
  }

  /**
   * Updates the agent's context with new information
   * @param {object} contextUpdate - New context information to merge
   */
  updateContext(contextUpdate) {
    this.context = { ...this.context, ...contextUpdate };
    this.stats.lastActivity = Date.now();
    logger.debug(`Agent ${this.agentId} context updated`, { keys: Object.keys(contextUpdate) });
    return this.context;
  }

  /**
   * Executes a tool with the given parameters
   * @param {string} toolName - Name of the tool to execute
   * @param {object} params - Parameters to pass to the tool
   * @returns {Promise<object>} - Result of the tool execution
   */
  async execute(toolName, params) {
    if (this.status !== 'ready') {
      throw new ToolError('AGENT_NOT_READY', `Agent is in ${this.status} state`);
    }

    const tool = tools[toolName];
    if (!tool) {
      throw new ToolError('TOOL_NOT_FOUND', `Tool "${toolName}" not found`);
    }

    // Check tool permissions
    if (tool.permissions && !tool.permissions.includes('public')) {
      // TODO: Implement more sophisticated permission checks
      // This would include JWT verification, role-based access, etc.
      throw new ToolError('PERMISSION_DENIED', `No permission to execute ${toolName}`);
    }

    try {
      // Validate parameters against schema
      const validated = tool.schema.parse(params);
      
      // Pre-execution hook for simulation or other checks
      if (this.config.simulateBeforeExecute && tool.simulate) {
        const simulationResult = await tool.simulate(validated, this.connection);
        logger.debug(`Simulation for ${toolName}:`, simulationResult);
        
        if (!simulationResult.success) {
          throw new ToolError('SIMULATION_FAILED', 
            `Tool execution would fail: ${simulationResult.reason}`);
        }
      }
      
      // Execute tool
      this.status = 'executing';
      this.emit('toolStart', { tool: toolName, params: validated });
      
      const executionStart = performance.now();
      const result = await Promise.race([
        tool.run(validated, this.connection, this.context),
        new Promise((_, reject) => 
          setTimeout(() => reject(new ToolError('TIMEOUT', 'Tool execution timed out')), 
            this.config.executionTimeout)
        )
      ]);
      
      const executionTime = performance.now() - executionStart;
      
      // Update stats
      this.stats.toolsExecuted++;
      this.stats.executionTime += executionTime;
      this.stats.lastActivity = Date.now();
      
      // Record execution in memory store
      const memoryRecord = {
        tool: toolName,
        params: validated,
        result,
        timestamp: new Date().toISOString(),
        executionTime
      };
      
      await memoryStore.save(this.agentId, memoryRecord);
      
      // Update context with result if configured
      if (tool.updateContext) {
        const contextUpdate = tool.updateContext(result, validated);
        this.updateContext(contextUpdate);
      }
      
      this.status = 'ready';
      this.emit('toolComplete', { 
        tool: toolName, 
        executionTime,
        success: true,
        result
      });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      this.status = 'error';
      
      const toolError = error instanceof ToolError 
        ? error 
        : new ToolError('EXECUTION_ERROR', error.message);
      
      // Record error in memory store
      await memoryStore.save(this.agentId, {
        tool: toolName,
        params,
        error: {
          code: toolError.code,
          message: toolError.message
        },
        timestamp: new Date().toISOString()
      });
      
      this.emit('toolError', {
        tool: toolName,
        error: toolError
      });
      
      this.status = 'ready';
      throw toolError;
    }
  }

  /**
   * Loads the agent's memory history
   * @param {number} limit - Maximum number of items to retrieve
   * @returns {Promise<Array>} - Memory records
   */
  async loadMemory(limit = this.config.maxMemoryItems) {
    return await memoryStore.get(this.agentId, limit);
  }

  /**
   * Gets agent statistics and status information
   * @returns {object} - Agent stats
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      status: this.status,
      contextSize: Object.keys(this.context).length
    };
  }

  /**
   * Gracefully shuts down the agent runtime
   */
  async shutdown() {
    this.status = 'shutting_down';
    this.emit('shutdown');
    
    // Persist final state
    await memoryStore.save(this.agentId, {
      type: 'system',
      action: 'shutdown',
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    });
    
    this.status = 'terminated';
    return { success: true, message: 'Agent shutdown complete' };
  }
}
