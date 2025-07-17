import axios from "axios";
import env from "./env";

const graphql = axios.create({
    baseURL: "https://api.github.com/graphql",
    headers: {
        Authorization: `bearer ${env.appAccessToken}`,
    },
});

export default graphql;