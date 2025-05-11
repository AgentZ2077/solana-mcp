import { Transaction, Message, SystemProgram } from '@solana/web3.js';
import { logger } from './logger.js';
import { ToolError } from './error.js';

/**
 * Simulates a transaction to check for potential errors before actual execution
 * 
 * @param {Transaction} transaction - The transaction to simulate
 * @param {Connection} connection - Solana connection
 * @param {Object} options - Simulation options
 * @param {Array} options.signers - Signers to include
 * @param {string} options.description - Human-readable description of the transaction
 * @returns {Promise<object>} - Simulation results with success flag and details
 */
export async function simulateTransaction(transaction, connection, options = {}) {
  const { signers = [], description = 'transaction' } = options;
  
  try {
    logger.debug(`Simulating ${description}...`);
    
    // We need to partially sign the transaction if signers are provided
    if (signers.length > 0) {
      transaction.sign(...signers);
    }
    
    // Simulate the transaction
    const simulationResult = await connection.simulateTransaction(transaction, {
      sigVerify: false, // Skip signature verification for simulation
      commitment: 'confirmed',
      encoding: 'base64'
    });
    
    // Get the result details
    const { err, logs, value } = simulationResult.value;
    
    // Log the result for debugging
    if (err) {
      logger.debug(`Simulation of ${description} failed:`, err);
      return {
        success: false,
        reason: err.toString(),
        logs,
        details: value
      };
    } else {
      logger.debug(`Simulation of ${description} successful`);
      logger.trace('Simulation logs:', logs);
      
      return {
        success: true,
        logs,
        details: value
      };
    }
  } catch (error) {
    logger.error(`Error simulating ${description}:`, error);
    return {
      success: false,
      reason: error.message,
      error
    };
  }
}

/**
 * Check if an account has sufficient SOL for a transaction
 * @param {PublicKey} accountPublicKey - The account to check
 * @param {Connection} connection - Solana connection
 * @param {number} requiredAmount - Amount required (in lamports)
 * @param {number} additionalBuffer - Buffer for transaction fees
 * @returns {Promise<object>} - Check result with success flag
 */
export async function checkSufficientBalance(accountPublicKey, connection, requiredAmount, additionalBuffer = 5000) {
  try {
    const balance = await connection.getBalance(accountPublicKey);
    const totalRequired = requiredAmount + additionalBuffer;
    
    logger.debug(`Balance check: ${balance} lamports, required: ${totalRequired} lamports`);
    
    if (balance < totalRequired) {
      return {
        success: false,
        reason: `Insufficient balance. Has ${balance / 1e9} SOL, needs at least ${totalRequired / 1e9} SOL`,
        balance,
        required: totalRequired
      };
    }
    
    return {
      success: true,
      balance,
      required: requiredAmount
    };
  } catch (error) {
    logger.error('Error checking balance:', error);
    return {
      success: false,
      reason: `Failed to check balance: ${error.message}`,
      error
    };
  }
}

/**
 * Simulate a token transfer
 * @param {Object} params - Parameters for the token transfer
 * @param {Connection} connection - Solana connection
 * @returns {Promise<object>} - Simulation results
 */
export async function simulateTokenTransfer(params, connection) {
  try {
    const { fromPubkey, toPubkey, mintPubkey, amount, signers } = params;
    
    // Here we'd build a token transfer transaction
    // For now we're just simulating a check without building the full SPL token transfer
    
    logger.debug(`Simulating token transfer of ${amount} tokens from ${fromPubkey.toBase58()} to ${toPubkey.toBase58()}`);
    
    // In a real implementation, you would:
    // 1. Get Associated Token Accounts for both parties
    // 2. Build the token transfer instruction
    // 3. Create the transaction
    // 4. Then simulate it with simulateTransaction()
    
    // For now, just return a mock simulation result
    return {
      success: true,
      message: `Token transfer of ${amount} tokens would likely succeed`,
      simulatedFee: 5000
    };
  } catch (error) {
    logger.error('Error simulating token transfer:', error);
    return {
      success: false,
      reason: error.message,
      error
    };
  }
}

/**
 * Calculate the estimated transaction fee 
 * @param {Transaction|Message} txOrMessage - Transaction or message to calculate fee for
 * @param {Connection} connection - Solana connection
 * @returns {Promise<number>} - Estimated fee in lamports
 */
export async function calculateTransactionFee(txOrMessage, connection) {
  try {
    // Convert Transaction to Message if needed
    const message = txOrMessage instanceof Transaction 
      ? txOrMessage.compileMessage() 
      : txOrMessage;
    
    // Get the fee for this message 
    const { value } = await connection.getFeeForMessage(message);
    
    if (value === null) {
      throw new ToolError('FEE_CALCULATION_FAILED', 'Unable to calculate transaction fee');
    }
    
    return value;
  } catch (error) {
    logger.error('Error calculating transaction fee:', error);
    throw new ToolError('FEE_CALCULATION_ERROR', `Failed to calculate fee: ${error.message}`);
  }
}
