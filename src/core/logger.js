// src/core/logger.js - Structured logging system for the MCP framework

/**
 * Custom logger module that provides formatting, severity levels, 
 * and potential integrations with external logging systems
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.colors = {
      error: '\x1b[31m', // red
      warn: '\x1b[33m',  // yellow
      info: '\x1b[36m',  // cyan
      debug: '\x1b[32m', // green
      trace: '\x1b[90m', // gray
      reset: '\x1b[0m'   // reset
    };
    
    this.timestamps = options.timestamps !== false;
    this.colorize = options.colorize !== false;
    
    // Configure outputs - could be expanded to write to files or external services
    this.outputs = {
      console: true,
      ...options.outputs
    };
  }

  /**
   * Sets the current logging level
   * @param {string} level - One of: error, warn, info, debug, trace
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
    } else {
      console.warn(`Invalid log level: ${level}. Using 'info' instead.`);
      this.level = 'info';
    }
  }

  /**
   * Formats a log message with timestamp, level, and optional color
   * @param {string} level - Log level
   * @param {string} message - Main log message
   * @param {any} args - Additional arguments to log
   * @returns {string} - Formatted log message
   */
  format(level, message, ...args) {
    const timestamp = this.timestamps ? `[${new Date().toISOString()}] ` : '';
    const levelStr = `[${level.toUpperCase()}]`;
    const colorStart = this.colorize ? this.colors[level] : '';
    const colorEnd = this.colorize ? this.colors.reset : '';
    
    let formattedMessage = `${timestamp}${colorStart}${levelStr}${colorEnd} ${message}`;
    
    if (args.length > 0) {
      // Format objects for better readability
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // Handle errors specially
          if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack}`;
          }
          // For other objects, try to stringify them
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Circular Structure]';
          }
        }
        return arg;
      });
      
      formattedMessage += ' ' + formattedArgs.join(' ');
    }
    
    return formattedMessage;
  }

  /**
   * Generic logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any[]} args - Additional arguments to log
   */
  log(level, message, ...args) {
    if (this.levels[level] <= this.levels[this.level]) {
      const formattedMessage = this.format(level, message, ...args);
      
      if (this.outputs.console) {
        if (level === 'error') {
          console.error(formattedMessage);
        } else if (level === 'warn') {
          console.warn(formattedMessage);
        } else {
          console.log(formattedMessage);
        }
      }
      
      // Here you could add additional outputs like file logging, 
      // sending to external services, etc.
    }
  }

  // Convenience methods for different log levels
  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  trace(message, ...args) {
    this.log('trace', message, ...args);
  }
  
  /**
   * Creates a child logger with a specific context
   * @param {string} context - Context name for this logger
   * @returns {Logger} - A new logger instance with context prefix
   */
  child(context) {
    const childLogger = new Logger({
      level: this.level,
      timestamps: this.timestamps,
      colorize: this.colorize,
      outputs: this.outputs
    });
    
    // Override methods to include context
    ['error', 'warn', 'info', 'debug', 'trace'].forEach(level => {
      childLogger[level] = (message, ...args) => {
        this.log(level, `[${context}] ${message}`, ...args);
      };
    });
    
    return childLogger;
  }
}

// Export a singleton instance for use throughout the app
export const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  timestamps: true,
  colorize: true
});
