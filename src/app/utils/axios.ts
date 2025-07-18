import axios from "axios";
import { token } from "./token";

const graphql = axios.create({
    baseURL: "https://api.github.com/graphql",
    headers: {
        Authorization: `bearer ${token}`,
    },
});

export default graphql;