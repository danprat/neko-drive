const isDev = process.env.NODE_ENV !== 'production' || process.env.DEBUG_LOGS === 'true';

/**
 * environment-aware logger helper
 */
const logger = {
    log: (...args) => {
        if (isDev) console.log(...args);
    },
    info: (...args) => {
        if (isDev) console.info(...args);
    },
    error: (...args) => {
        // We always want to see errors, even in production, 
        // unless you want to silence them completely.
        console.error(...args);
    },
    warn: (...args) => {
        if (isDev) console.warn(...args);
    }
};

module.exports = logger;
