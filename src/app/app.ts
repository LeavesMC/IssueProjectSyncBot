import VCLight, { VCLightApp, VCLightRequest, VCLightResponse } from "vclight";
import router from "./router";
import "./initRouter";
import { autoUpdateAccessToken } from "./utils/token";
import { IncomingMessage } from "http";
import { verify } from "./utils/auth";

const app = new VCLight();
autoUpdateAccessToken().then(() => {
    app.use({
        process: async function (request: VCLightRequest, response: VCLightResponse, _: VCLightApp) {
            const body = await getRawBody(request.rawRequest.request);
            const headers = request.headers;
            const signature = headers["x-hub-signature-256"];
            if (!(typeof signature === "string") || !(await verify(signature.replace("sha256=", ""), body))) {
                response.status = 401;
                return;
            }
        },
        post: async function (_: VCLightRequest, __: VCLightResponse, ___: VCLightApp) {
        },
    });
    app.use(router);
});

function getRawBody(rawRequest: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = "";
        rawRequest.on("data", chunk => {
            data += chunk;
        });
        rawRequest.on("end", () => {
            resolve(data);
        });
        rawRequest.on("error", err => {
            reject(err);
        });
    });
}

export default app;