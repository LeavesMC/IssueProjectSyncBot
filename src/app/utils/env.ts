import { config } from "dotenv";
import * as process from "node:process";

config();

const env = {
    port: parseInt(process.env.PORT || "14514", 10),
    logLevel: process.env.LOG_LEVEL || "info",
    githubAppId: process.env.GITHUB_APP_ID!,
    githubInstallationId: process.env.GITHUB_INSTALLATION_ID!,
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    githubAccessTokenExpiresIn: parseInt(process.env.GITHUB_ACCESS_TOKEN_EXPIRES_IN || "50", 10),
    githubAccessTokenRefreshInterval: parseInt(process.env.GITHUB_ACCESS_TOKEN_REFRESH_INTERVAL || "45", 10),
};

export default env;
