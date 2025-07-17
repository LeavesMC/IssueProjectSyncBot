import graphql from "./axios";
import { projectFieldOptionNodeIdMap } from "./cache";

export const FIELDS = {
    Status: "Status",
}

export async function getProjectFieldOptionNodeId(
    orgLoginName: string,
    projectId: number,
    fieldName: string,
    optionName: string
): Promise<string | undefined> {
    const cacheKey = `${projectId}:${fieldName}:${optionName}`;
    const cache = projectFieldOptionNodeIdMap.get(cacheKey);
    if (cache) return cache.toString();
    const query = `
      query($projectId: Int!, $orgLoginName: String!) {
        organization(login: $orgLoginName) {
          projectV2(number: $projectId) {
            fields(first: 100) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;
    const variables = { projectId, orgLoginName };
    const res = await graphql.post("", { query, variables });
    console.log(res.data);
    const fields = res.data?.data?.organization?.projectV2?.fields?.nodes;
    if (!fields) return undefined;
    const field = fields.find((f: any) => f.name === fieldName);
    if (!field || !field.options) return undefined;
    const option = field.options.find((o: any) => o.name === optionName);
    if (!option) return undefined;
    projectFieldOptionNodeIdMap.set(cacheKey, option.id);
    return option.id;
}