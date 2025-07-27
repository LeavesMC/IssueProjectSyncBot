import router from "../router";
import { handleIssueEvent } from "../utils/issues";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/log";
import { handleProjectItemEvent } from "../utils/projects";
import env from "../utils/env";

router.on("/webhook", async (request, response) => {
    if (response.status === 401) return;
    const headers = request.headers;

    const body = request.body;
    const eventName = headers["x-github-event"];
    if (!eventName || typeof eventName !== "string") {
        response.status = 400;
        return;
    }
    handleRequest(eventName, body).then().catch((err) => logger.error(err));
    response.status = 200;
});

async function handleRequest(eventName: string, body: any): Promise<void> {
    if (!isValidTrigger(body)) return;

    const handlers: Record<string, (body: any) => Promise<void>> = {
        issues: handleIssueEvent,
        projects_v2_item: handleProjectItemEvent,
    };

    await withRetry(async () => {
        const handler = handlers[eventName];
        if (!handler) return;
        await handler(body);
    }, "handle webhook event");
}



function isValidTrigger(body: any): boolean {
    const sender = body.sender;
    if (!sender) return false;
    const login = sender.login;
    if (!login || typeof login !== "string") return false;
    return login !== `${env.githubAppName}[bot]`;
}