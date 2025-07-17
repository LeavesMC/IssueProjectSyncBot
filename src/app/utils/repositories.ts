import graphql from "./axios";
import { repoNodeIdMap } from "./cache";

export async function getOrgRepoNodeId(orgLoginName: string, repoName: string): Promise<string | undefined> {
    const cache = repoNodeIdMap.get(repoName);
    if (cache) return cache.toString();
    const query = `
      query($orgLoginName: String!, $repoName: String!) {
        organization(login: $orgLoginName) {
          repository(name: $repoName) {
            id
          }
        }
      }
    `;
    const variables = {orgLoginName, repoName};

    const res = await graphql.post("", {query, variables});
    const id = res.data?.data?.organization?.repository?.id;
    if (!id) return undefined;
    repoNodeIdMap.set(repoName, id.toString());
    return id.toString();
}