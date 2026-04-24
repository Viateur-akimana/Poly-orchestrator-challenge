/**
 * Logger Utility
 * Centralized logging with consistent formatting
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

const LOG_ICONS = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌',
};

class Logger {
  private context: string;

  constructor(context = 'App') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const icon = LOG_ICONS[level];
    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;
    
    let formatted = `${color}[${timestamp}] ${icon} [${this.context}] ${message}${reset}`;
    
    if (meta) {
      formatted += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return formatted;
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: Error | any): void {
    const meta = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage('error', message, meta));
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

/**
 * Create a logger instance for a module
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default application logger
 */
export const logger = new Logger('Skyline');

export default logger;
