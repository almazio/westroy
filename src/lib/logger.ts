// ============================================
// WESTROY — Structured Logger
// ============================================
// Replaces raw console.log/warn/error across the app.
// In production, can be swapped for a real transport (Sentry, Datadog, etc.)

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${context}] ${message}${metaStr}`;
}

export function createLogger(context: string) {
    return {
        debug(message: string, meta?: Record<string, unknown>) {
            if (shouldLog('debug')) console.debug(formatMessage('debug', context, message, meta));
        },
        info(message: string, meta?: Record<string, unknown>) {
            if (shouldLog('info')) console.info(formatMessage('info', context, message, meta));
        },
        warn(message: string, meta?: Record<string, unknown>) {
            if (shouldLog('warn')) console.warn(formatMessage('warn', context, message, meta));
        },
        error(message: string, error?: unknown, meta?: Record<string, unknown>) {
            if (shouldLog('error')) {
                const errInfo = error instanceof Error
                    ? { name: error.name, message: error.message, stack: error.stack }
                    : { raw: String(error) };
                console.error(formatMessage('error', context, message, { ...meta, error: errInfo }));
            }
        },
    };
}

// Pre-built loggers for common contexts
export const log = createLogger('app');
