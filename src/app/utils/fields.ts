import graphql from "./axios";
import { projectFieldOptionNodeIdMap } from "./cache";
import { orgLoginName } from "./config";

export const FIELDS = {
    Status: "Status",
};

export async function getProjectFieldOptionNodeId(
    projectId: number,
    fieldName: string,
    optionName: string,
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
    const variables = {projectId, orgLoginName};
    const res = await graphql.post("", {query, variables});
    const fields = res.data?.data?.organization?.projectV2?.fields?.nodes;
    if (!fields) return undefined;
    const field = fields.find((f: any) => f.name === fieldName);
    if (!field || !field.options) return undefined;
    const option = field.options.find((o: any) => o.name === optionName);
    if (!option) return undefined;
    projectFieldOptionNodeIdMap.set(cacheKey, option.id);
    return option.id;
}

export async function getProjectItemFieldValue(
    projectNodeId: string,
    itemNodeId: string,
    fieldNodeId: string,
): Promise<string | undefined> {
    const query = `
      query($itemId: ID!) {
        node(id: $itemId) {
          ... on ProjectV2Item {
            fieldValues(first: 100) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  field {
                    ... on ProjectV2SingleSelectField {
                      id
                    }
                  }
                  name
                  optionId
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
        itemId: itemNodeId
    };

    const res = await graphql.post("", {query, variables});

    const fieldValues = res.data?.data?.node?.fieldValues?.nodes;
    if (!fieldValues) return undefined;

    const fieldValue = fieldValues.find((value: any) => value.field?.id === fieldNodeId);
    if (!fieldValue) return undefined;

    return fieldValue.name;
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
    await graphql.post("", {query, variables});
}