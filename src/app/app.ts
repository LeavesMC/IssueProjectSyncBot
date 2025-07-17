import VCLight from "vclight";
import router from "./router";
import "./initRouter";

const app = new VCLight();
app.use(router);
export default app;
