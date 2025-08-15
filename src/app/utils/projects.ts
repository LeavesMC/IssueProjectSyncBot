import { projectFieldNodeIdMap, projectNodeIdMap } from "./cache";
import graphql from "./axios";
import { allStatusLabels, orgLoginName, projectData, typeLabelData } from "./config";
import {
    addLabelToIssue,
    getIssueLabels,
    getValidIssueNumber,
    getValidRepoLabelNodeId,
    removeLabelFromIssue,
} from "./issues";
import { logger } from "./log";

const listenActions = [
    "edited",
];

export async function handleProjectItemEvent(body: any) {
    if (!isValidAction(body.action)) return;

    const newLabelName = getValidNewIssueLabelName(body);
    if (!newLabelName) return;
    const newLabelType = typeLabelData.find(it => it.labels.includes(newLabelName));
    if (!newLabelType) return;

    const projectItem = getValidProjectItem(body);
    const projectData = getValidProjectData(projectItem);
    const repoName = projectData.repo;
    const issueNodeId = getValidIssueNodeId(projectItem);
    const issueNumber = await getValidIssueNumber(repoName, issueNodeId);
    const labelNodeId = await getValidRepoLabelNodeId(repoName, newLabelName);
    const issueLabels: { id: string, name: string }[] = await getIssueLabels(repoName, issueNumber);

    if (issueLabels.some(it => it.name === newLabelName)) return;
    if (issueLabels.some(it => newLabelType.labels.includes(it.name))) return;

    const needsAddLabel = issueLabels.some(it => it.name !== newLabelName);
    const forRemoval = issueLabels
        .filter(it => allStatusLabels.includes(it.name))
        .filter(it => it.name !== newLabelName);

    for (const it of forRemoval) {
        await removeLabelFromIssue(issueNodeId, it.id);
    }

    if (forRemoval.length !== 0) {
        const removedLabels = forRemoval.map(it => it.name).join(", ");
        logger.info(`[Project => Issue] Issue ${repoName}#${issueNumber} no longer labeled as [${removedLabels}]`);
    }

    if (!needsAddLabel) {
        logger.info(`[Project => Issue] Issue ${repoName}#${issueNumber} already labeled as [${newLabelName}], skipping`);
        return;
    }

    await addLabelToIssue(issueNodeId, labelNodeId);
    logger.info(`[Project => Issue] Issue ${repoName}#${issueNumber} now labeled as [${newLabelName}]`);
}

function isValidAction(action: any): boolean {
    return !!action && typeof action === "string" && listenActions.includes(action);
}

function getValidNewIssueLabelName(body: any): string | undefined {
    const newTypeName = getNewTypeName(body);
    if (!newTypeName) return undefined;
    return typeLabelData
        .find(it => it.type === newTypeName)
        ?.labels[0];
}

function getValidProjectData(projectItem: any) {
    const projectData = getProjectData(projectItem);
    if (!projectData) throw new Error("Project data not found");
    return projectData;
}

function getValidProjectItem(body: any): any {
    const item = body.projects_v2_item;
    if (!item || !item["content_type"] || !item["content_node_id"] || !item["project_node_id"]) throw new Error("Invalid project item data");
    return item;
}

function getValidIssueNodeId(projectItem: any): string {
    const issueNodeId = projectItem.content_node_id;
    if (!issueNodeId) throw new Error("Issue nodeId not found in project item");
    return issueNodeId;
}

function getNewTypeName(body: any): string | undefined {
    const changes = body.changes;
    if (!changes || !changes.field_value || !changes.field_value.to || !changes.field_value.to.name) return undefined;
    return changes.field_value.to.name;
}

function getProjectData(projectItem: any) {
    const projectNodeId = projectItem.project_node_id;
    if (!projectNodeId || typeof projectNodeId !== "string") return undefined;
    return projectData.find(async it => await getProjectNodeId(it.projectId) === projectNodeId);
}

export async function getProjectNodeId(projectId: number): Promise<string | undefined> {
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