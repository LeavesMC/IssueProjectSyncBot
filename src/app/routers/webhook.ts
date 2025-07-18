import router from "../router";
import { handleIssueEvent } from "../utils/issues";
import { RequestContext } from "@vclight/router";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/log";
import { handleProjectItemEvent } from "../utils/projects";

router.on("/webhook", async (request, response) => {
    handleRequest(request).then().catch((err) => logger.error(err));
    response.status = 200;
});

async function handleRequest(request: RequestContext) {
    const headers = request.headers;
    const body = await request.body;
    const eventName = headers["x-github-event"];
    if (!eventName || typeof eventName !== "string") return;

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