import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Always log to console in production and development for Railway/Cloud compatibility
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// Add file logging only as an addition, not a primary transport
if (process.env.NODE_ENV !== 'test') { // Don't log to files in tests
    try {
        logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
        logger.add(new winston.transports.File({ filename: 'combined.log' }));
    } catch (err) {
        console.warn('File logging failed, using console only:', err);
    }
}

export default logger;
