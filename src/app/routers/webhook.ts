import router from "../router";
import { handleIssueEvent } from "../utils/issues";

router.on("/webhook", async (request, response) => {
    const headers = request.headers;
    const body = await request.body;

    const eventName = headers["x-github-event"];
    console.log("Received webhook event:", eventName);

    switch (eventName) {
        case "issues":
            handleIssueEvent(body).then(msg => {
                if (msg) {
                    console.log(msg);
                }
            });
    }

    response.status = 200;
});