// src/lib/utils/logger.ts
// Enterprise Logging Utility

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error | null;
}

class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context: string = "App") {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  // ============================================
  // Private: Format Log Entry
  // ============================================

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const message = `[${timestamp}] [${level}] [${this.context}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      return `${message}\nContext: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      return `${message}\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
    }

    return message;
  }

  // ============================================
  // Private: Output Log
  // ============================================

  private output(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry);

    switch (entry.level) {
      case "debug":
        if (this.isDevelopment) {
          console.debug(formattedLog);
        }
        break;
      case "info":
        console.log(formattedLog);
        break;
      case "warn":
        console.warn(formattedLog);
        break;
      case "error":
        console.error(formattedLog);
        break;
    }
  }

  // ============================================
  // Public: Debug Logging
  // ============================================

  debug(message: string, context?: Record<string, any>): void {
    this.output({
      timestamp: new Date(),
      level: "debug",
      message,
      context,
    });
  }

  // ============================================
  // Public: Info Logging
  // ============================================

  info(message: string, context?: Record<string, any>): void {
    this.output({
      timestamp: new Date(),
      level: "info",
      message,
      context,
    });
  }

  // ============================================
  // Public: Warn Logging
  // ============================================

  warn(message: string, context?: Record<string, any>): void {
    this.output({
      timestamp: new Date(),
      level: "warn",
      message,
      context,
    });
  }

  // ============================================
  // Public: Error Logging
  // ============================================

  error(
    message: string,
    error?: Error | null,
    context?: Record<string, any>,
  ): void {
    this.output({
      timestamp: new Date(),
      level: "error",
      message,
      context,
      error: error || null,
    });
  }

  // ============================================
  // Public: Create Child Logger
  // ============================================

  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`);
  }

  // ============================================
  // Public: Audit Logging
  // ============================================

  audit(action: string, userId: string, details?: Record<string, any>): void {
    this.info(`[AUDIT] ${action}`, {
      userId,
      ...details,
    });
  }

  // ============================================
  // Public: Security Event Logging
  // ============================================

  security(
    event: string,
    severity: "low" | "medium" | "high",
    details?: Record<string, any>,
  ): void {
    const logLevel: LogLevel =
      severity === "high" ? "error" : severity === "medium" ? "warn" : "info";

    const context = { severity, ...details };

    if (logLevel === "error") {
      this.error(`[SECURITY] ${event}`, null, context);
    } else if (logLevel === "warn") {
      this.warn(`[SECURITY] ${event}`, context);
    } else {
      this.info(`[SECURITY] ${event}`, context);
    }
  }

  // ============================================
  // Public: Performance Logging
  // ============================================

  performance(
    operation: string,
    durationMs: number,
    context?: Record<string, any>,
  ): void {
    const logLevel = durationMs > 1000 ? "warn" : "info";

    this[logLevel](
      `[PERFORMANCE] ${operation} completed in ${durationMs}ms`,
      context,
    );
  }
}

// ============================================
// Create Default Logger Instance
// ============================================

export const logger = new Logger("App");

// ============================================
// Export Logger Class
// ============================================

export default Logger;
