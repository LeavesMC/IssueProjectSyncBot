import axios from 'axios';
import env from "./env";
import graphql from "./axios";
import { logger } from "./log";
import { withRetry } from "./retry";
import jwt = require('jsonwebtoken');

export let token: string | undefined = undefined;

function generateJwt(): string {
    return jwt.sign(
        {
            iat: Math.floor(Date.now() / 1000) - 60,
            exp: Math.floor(Date.now() / 1000) + (10 * env.githubAccessTokenExpiresIn),
            iss: env.githubAppId,
        },
        env.githubAppPrivateKey.replace(/\\n/g, '\n'),
        {algorithm: 'RS256'},
    );
}

async function tryFetchAccessToken(): Promise<void> {
    const jwtToken = generateJwt();
    const res = await axios.post(
        `https://api.github.com/app/installations/${env.githubInstallationId}/access_tokens`,
        {},
        {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: 'application/vnd.github+json',
            },
        },
    );
    token = res.data.token;
    graphql.defaults.headers['Authorization'] = `bearer ${token}`;
    logger.info("GitHub access token updated successfully.");
}

async function fetchAccessToken(): Promise<void> {
    await withRetry(() => tryFetchAccessToken(), "fetch GitHub access token");
}

export async function autoUpdateAccessToken() {
    await fetchAccessToken();
    setInterval(async () => {
        await fetchAccessToken();
    }, env.githubAccessTokenRefreshInterval * 60 * 1000);
}