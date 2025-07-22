import router from "../router";
import { handleIssueEvent } from "../utils/issues";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/log";
import { handleProjectItemEvent } from "../utils/projects";
import { verify } from "../utils/auth";

router.on("/webhook", async (request, response) => {
    const headers = request.headers;

    const body = request.body;
    const eventName = headers["x-github-event"];
    const signature = headers["x-hub-signature-256"];
    if (!(typeof signature === "string") || !(await verify(signature, JSON.stringify(body)))) {
        response.status = 401;
        return;
    }
    if (!eventName || typeof eventName !== "string") {
        response.status = 400;
        return;
    }
    handleRequest(eventName, body).then().catch((err) => logger.error(err));
    response.status = 200;
});

async function handleRequest(eventName: string, body: any): Promise<void> {


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