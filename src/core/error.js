/ src/core/error.js - Enhanced error handling for MCP framework

/**
 * Base error class for tool-related errors
 */
export class ToolError extends Error {
  /**
   * @param {string} code - Error code for programmatic handling
   * @param {string} message - Human-readable error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   * @param {Object} [options.context] - Additional context for the error
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.timestamp = new Date();
    
    // Add additional context
    if (options.context) {
      this.context = options.context;
    }
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // If there's a cause, capture it
    if (options.cause) {
      this.cause = options.cause;
    }
  }
  
  /**
   * Formats the error for logging or display
   * @returns {Object} Formatted error object
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack.split('\n')
    };
  }
}

/**
 * Error thrown when tool validation fails
 */
export class ValidationError extends ToolError {
  constructor(message, context = {}) {
    super('VALIDATION_ERROR', message, { context });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a permission check fails
 */
export class PermissionDeniedError extends ToolError {
  constructor(message, context = {}) {
    super('PERMISSION_DENIED', message, { context });
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when a blockchain operation fails
 */
export class BlockchainError extends ToolError {
  constructor(message, cause = null, context = {}) {
    super('BLOCKCHAIN_ERROR', message, { cause, context });
    this.name = 'BlockchainError';
  }
}

/**
 * Error thrown when a transaction times out
 */
export class TimeoutError extends ToolError {
  constructor(message, context = {}) {
    super('TIMEOUT', message, { context });
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when a simulation indicates a transaction would fail
 */
export class SimulationError extends ToolError {
  constructor(message, simulationResult, context = {}) {
    super('SIMULATION_FAILED', message, { 
      context: { 
        ...context,
        simulationResult 
      } 
    });
    this.name = 'SimulationError';
    this.simulationResult = simulationResult;
  }
}

/**
 * Error thrown when an account doesn't have enough funds
 */
export class InsufficientFundsError extends ToolError {
  constructor(available, required, context = {}) {
    super(
      'INSUFFICIENT_FUNDS', 
      `Insufficient funds. Available: ${available} SOL, Required: ${required} SOL`,
      { context }
    );
    this.name = 'InsufficientFundsError';
    this.available = available;
    this.required = required;
  }
}

/**
 * Maps Solana transaction errors to human-readable messages
 * @param {string} errorMessage - Error message from Solana
 * @returns {string} Human-readable error message
 */
export function translateSolanaError(errorMessage) {
  // Common error patterns from Solana that we can make more user-friendly
  const errorPatterns = {
    'Attempt to debit an account but': 'Insufficient funds for this transaction',
    'insufficient funds': 'Insufficient funds for this transaction',
    'invalid program id': 'Invalid program address',
    'Cross-program invocation with unauthorized signer or writable account': 'Permission denied to modify the account',
    'custom program error: 0x': 'The program returned an error',
    'failed to send transaction: Transaction simulation failed': 'Transaction simulation failed',
    'Blockhash not found': 'Transaction expired, please retry',
    'Signature verification failed': 'Invalid signature',
  };

  for (const [pattern, translation] of Object.entries(errorPatterns)) {
    if (errorMessage.includes(pattern)) {
      return translation;
    }
  }

  // If no match, return the original message
  return errorMessage;
}

/**
 * Wraps async functions with standardized error handling
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Transform Solana errors into our error types
      if (error.message && error.message.includes('Attempt to debit an account but')) {
        throw new InsufficientFundsError('unknown', 'unknown', { cause: error });
      }
      
      // For simulation failures
      if (error.message && error.message.includes('Transaction simulation failed')) {
        throw new SimulationError(
          translateSolanaError(error.message),
          error.simulationResult || {},
          { cause: error }
        );
      }
      
      // For RPC timeouts
      if (error.message && (
        error.message.includes('timeout') || 
        error.message.includes('timed out')
      )) {
        throw new TimeoutError(
          'The operation timed out. Please try again.',
          { cause: error }
        );
      }
      
      // If it's already one of our errors, just rethrow it
      if (error instanceof ToolError) {
        throw error;
      }
      
      // Otherwise wrap in a general ToolError
      throw new ToolError(
        'EXECUTION_ERROR',
        translateSolanaError(error.message),
        { cause: error }
      );
    }
  };
}
