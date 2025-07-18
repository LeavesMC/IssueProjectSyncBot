import log4js = require("log4js");
import env from "./env";

log4js.configure({
    appenders: {
        out: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '[%d{hh:mm:ss}] [%p] %m'
            }
        }
    },
    categories: {
        default: { appenders: ['out'], level: 'info' }
    }
});

const logger = log4js.getLogger();

logger.level = env.logLevel;

export { logger };