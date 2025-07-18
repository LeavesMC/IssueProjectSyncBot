import * as http from "http";
import app from "./app/app";
import env from "./app/utils/env";
import { logger } from "./app/utils/log";

const server = http.createServer();

server.on("request", app.httpHandler());

server.listen(env.port, () => {
    logger.info("LeavesMC Issue Project Sync Bot");
    logger.info(`Ready! Available at http://localhost:${env.port}`);
});
