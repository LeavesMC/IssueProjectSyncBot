import VCLight from "vclight";
import router from "./router";
import "./initRouter";
import { autoUpdateAccessToken } from "./utils/token";

const app = new VCLight();
autoUpdateAccessToken().then(() => {
    app.use(router);
});
export default app;