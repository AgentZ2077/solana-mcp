import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { logger } from './logger.js';
import { ToolError, withErrorHandling } from './error.js';
import { simulateTransaction } from './simulator.js';

/**
 * Initialize a connection to an Anchor program
 * 
 * @param {Object} idl - The IDL for the program
 * @param {string|PublicKey} programId - The program ID
 * @param {Object} options - Connection options
 * @param {Keypair} options.payer - The payer keypair
 * @param {Connection} options.connection - Solana connection
 * @returns {Program} - Initialized Anchor program
 */
export function initializeProgram(idl, programId, options) {
  const { payer, connection } = options;
  
  if (!payer || !connection) {
    throw new ToolError('INVALID_PARAMS', 'Payer and connection are required');
  }
  
  // Create an Anchor Provider
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: payer.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(payer);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map(tx => {
          tx.partialSign(payer);
          return tx;
        });
      }
    },
    { commitment: 'confirmed', preflightCommitment: 'confirmed' }
  );
  
  // Initialize the program
  const programKey = programId instanceof PublicKey ? programId : new PublicKey(programId);
  const program = new Program(idl, programKey, provider);
  
  logger.debug(`Initialized Anchor program: ${programKey.toString()}`);
  
  return program;
}

/**
 * Execute a transaction through an Anchor program with simulation and error handling
 * 
 * @param {Program} program - The Anchor program
 * @param {string} methodName - The method to call
 * @param {Array} args - Arguments for the method
 * @param {Object} accounts - Account constraints
 * @param {Object} options - Additional options
 * @param {Array} options.signers - Additional signers
 * @param {boolean} options.simulate - Whether to simulate before executing
 * @param {string} options.description - Human-readable description for logs
 * @returns {Promise<string>} - Transaction signature
 */
export const executeTransaction = withErrorHandling(
  async (program, methodName, args = [], accounts = {}, options = {}) => {
    const { 
      signers = [], 
      simulate = true, 
      description = `${program.programId.toString()} ${methodName}`
    } = options;
    
    try {
      logger.info(`Executing Anchor transaction: ${description}`);
      
      // Build the transaction
      const method = program.methods[methodName];
      if (!method) {
        throw new ToolError('METHOD_NOT_FOUND', `Method ${methodName} not found on program`);
      }
      
      // Convert any number arguments to BN if they're not already
      const processedArgs = args.map(arg => 
        typeof arg === 'number' && !Object.prototype.toString.call(arg).includes('BigNumber') 
          ? new BN(arg) 
          : arg
      );
      
      // Call the method with arguments and accounts
      const tx = await method(...processedArgs)
        .accounts(accounts)
        .signers(signers)
        .transaction();
      
      // Simulate first if requested
      if (simulate) {
        const simulationResult = await simulateTransaction(
          tx, 
          program.provider.connection,
          { signers: [program.provider.wallet, ...signers], description }
        );
        
        if (!simulationResult.success) {
          throw new ToolError(
            'SIMULATION_FAILED', 
            `Transaction would fail: ${simulationResult.reason}`,
            { context: { simulation: simulationResult } }
          );
        }
        
        logger.debug(`Simulation successful for ${description}`);
      }
      
      // Execute the transaction
      const txid = await program.provider.sendAndConfirm(tx, signers);
      
      logger.info(`Transaction successful: ${txid}`);
      return {
        success: true,
        signature: txid,
        message: `Successfully executed ${description}`
      };
    } catch (error) {
      logger.error(`Error executing ${description}:`, error);
      throw error;
    }
  }
);

/**
 * Find a PDA (Program Derived Address) with error handling
 * 
 * @param {Array<Buffer|Uint8Array>} seeds - Seeds for the PDA
 * @param {PublicKey} programId - Program ID
 * @returns {[PublicKey, number]} - The PDA and bump seed
 */
export function findProgramAddress(seeds, programId) {
  try {
    return PublicKey.findProgramAddressSync(seeds, programId);
  } catch (error) {
    logger.error('Error finding program address:', error);
    throw new ToolError('PDA_ERROR', `Failed to derive program address: ${error.message}`);
  }
}

/**
 * Get account data with proper error handling and type conversion
 * 
 * @param {Program} program - The Anchor program
 * @param {string} accountType - The account type defined in the IDL
 * @param {PublicKey|string} address - Account address
 * @returns {Promise<Object>} - Parsed account data
 */
export const getAccountData = withErrorHandling(
  async (program, accountType, address) => {
    const accountAddress = typeof address === 'string' ? new PublicKey(address) : address;
    
    logger.debug(`Fetching ${accountType} account: ${accountAddress.toString()}`);
    
    try {
      const accountInfo = await program.account[accountType].fetch(accountAddress);
      return {
        pubkey: accountAddress,
        account: accountInfo
      };
    } catch (error) {
      // Handle specific cases like account not found
      if (error.message.includes('Account does not exist')) {
        throw new ToolError(
          'ACCOUNT_NOT_FOUND', 
          `${accountType} account not found: ${accountAddress.toString()}`
        );
      }
      throw error;
    }
  }
);

/**
 * Helper to create an account with proper size calculation and rent exemption
 * 
 * @param {Program} program - The Anchor program
 * @param {Object} params - Parameters
 * @param {Keypair} params.payer - Account that pays for the creation
 * @param {Keypair|null} params.newAccount - New account keypair (or null for PDA)
 * @param {number} params.space - Space for the account in bytes
 * @param {PublicKey} params.owner - Owner of the new account (usually program ID)
 * @returns {Promise<Object>} - Creation result with signature
 */
export const createAccount = withErrorHandling(
  async (program, { payer, newAccount, space, owner }) => {
    // Use program ID as default owner if not specified
    const ownerPubkey = owner || program.programId;
    
    // Calculate minimum rent-exempt balance 
    const rentExemptBalance = await program.provider.connection.getMinimumBalanceForRentExemption(space);
    
    logger.debug(`Creating account. Space: ${space}, Rent: ${rentExemptBalance / 1e9} SOL`);
    
    // Create the transaction
    const tx = await SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: newAccount.publicKey,
      lamports: rentExemptBalance,
      space,
      programId: ownerPubkey
    });
    
    // Send the transaction
    const signature = await program.provider.sendAndConfirm(tx, [payer, newAccount]);
    
    return {
      success: true,
      signature,
      address: newAccount.publicKey.toString(),
      rentExemptBalance
    };
  }
);
