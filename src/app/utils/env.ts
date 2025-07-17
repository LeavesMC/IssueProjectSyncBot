import { config } from "dotenv";
import * as process from "node:process";

config();

const env = {
    port: parseInt(process.env.PORT || "14514", 10),
    appAccessToken: process.env.APP_ACCESS_TOKEN!!,
    logLevel: process.env.LOG_LEVEL || "info",
};

export default env;
