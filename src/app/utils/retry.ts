import { logger } from "./log";

export async function withRetry<T>(
    fn: () => Promise<T>,
    opName: string,
    maxRetries: number = 5,
    delay: number = 2000,
    attempt: number = 0,
): Promise<T> {
    try {
        logger.info(`Attempt ${attempt + 1} for task: ${opName}`);
        return await fn();
    } catch (err) {
        if (attempt >= maxRetries) throw new Error(`Task ${opName} failed after ${attempt + 1} attempts: ${err}`);
        logger.warn(`Task [${opName}] failed on attempt ${attempt + 1}: ${err}. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        return withRetry(fn, opName, maxRetries, delay * 2, attempt + 1);
    }
}