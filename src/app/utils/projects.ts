import { projectFieldNodeIdMap, projectNodeIdMap } from "./cache";
import graphql from "./axios";

export async function getProjectNodeId(orgLoginName: string, projectId: number): Promise<string | undefined> {
    const cache = projectNodeIdMap.get(projectId);
    if (cache) return cache.toString();
    const query = `
      query($projectId: Int!, $orgLoginName: String!) {
        organization(login: $orgLoginName) {
          projectV2(number: $projectId) {
            id
          }
        }
      }
    `;
    const variables = {projectId, orgLoginName};

    const res = await graphql.post("", {query, variables});
    const id = res.data?.data?.organization?.projectV2?.id;
    if (!id) return undefined;
    projectNodeIdMap.set(projectId, id);
    return id;
}

export async function getProjectFieldNodeId(
    orgLoginName: string,
    projectId: number,
    fieldName: string,
): Promise<string | undefined> {
    const cacheKey = `${projectId}:${fieldName}`;
    const cache = projectFieldNodeIdMap.get(cacheKey);
    if (cache) return cache.toString();

    const query = `
      query($projectId: Int!, $orgLoginName: String!) {
        organization(login: $orgLoginName) {
          projectV2(number: $projectId) {
            fields(first: 100) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;
    const variables = {projectId, orgLoginName};

    const res = await graphql.post("", {query, variables});
    const fields = res.data?.data?.organization?.projectV2?.fields?.nodes;
    if (!fields) return undefined;

    const field = fields.find((f: any) => f.name === fieldName);
    if (!field) return undefined;

    projectFieldNodeIdMap.set(cacheKey, field.id);
    return field.id;
}

export async function getOrAddIssueToProject(
    projectNodeId: string,
    issueNodeId: string,
): Promise<string | undefined> {
    const query = `
      query($projectId:ID!, $contentId:ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, filterBy: {contentId: $contentId}) {
              nodes {
                id
                content {
                  ... on Issue { id }
                }
              }
            }
          }
        }
      }
    `;
    const variables = {projectId: projectNodeId, contentId: issueNodeId};
    const res = await graphql.post("", {query, variables});
    const items = res.data?.data?.node?.items?.nodes;
    if (items && items.length > 0) return items[0].id;

    const addQuery = `
      mutation($projectId:ID!, $contentId:ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item { id }
        }
      }
    `;
    const addVariables = {projectId: projectNodeId, contentId: issueNodeId};
    const addRes = await graphql.post("", {query: addQuery, variables: addVariables});
    return addRes.data?.data?.addProjectV2ItemById?.item?.id;
}

export async function setProjectItemFieldValue(
    projectNodeId: string,
    itemNodeId: string,
    fieldNodeId: string,
    fieldValue: string,
): Promise<void> {
    const query = `
      mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $value:ProjectV2FieldValue!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId,
          itemId: $itemId,
          fieldId: $fieldId,
          value: $value
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;
    const variables = {
        projectId: projectNodeId,
        itemId: itemNodeId,
        fieldId: fieldNodeId,
        value: {
            singleSelectOptionId: fieldValue,
        },
    };

    const result = await graphql.post("", {query, variables});
    console.log(result.data);
}