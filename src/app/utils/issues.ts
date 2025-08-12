import { allStatusLabels, orgLoginName, projectData, typeLabelData } from "./config";
import graphql from "./axios";
import { issueLabelNodeIdMap, issueNodeIdMap, issueNumberMap } from "./cache";
import { getOrAddIssueToProject, getProjectFieldNodeId, getProjectNodeId } from "./projects";
import { FIELDS, getProjectFieldOptionNodeId, getProjectItemFieldValue, setProjectItemFieldValue } from "./fields";
import { logger } from "./log";

const listenActions = [
    // "reopened", // this will conflict with github-project-automation
    "labeled",
];

export async function handleIssueEvent(body: any) {
    if (!isValidAction(body.action)) return;

    const issue = getValidIssue(body);
    const projectId = getProjectIdByIssue(issue);
    if (!projectId) return;
    const label = getLabelFromBodyOrIssue(body, issue);
    if (!allStatusLabels.includes(label.name)) return;

    const projectType = getValidProjectType(label);
    const projectName = getValidProjectName(issue);
    const repoName = getValidIssueRepoName(issue);

    const issueNodeId = await getValidIssueNodeId(repoName, issue.number);
    const projectNodeId = await getValidProjectNodeId(projectId);
    const projectFieldNodeId = await getValidProjectFieldNodeId(projectId);
    const issueItemNodeId = await getValidIssueItemNodeId(projectNodeId, issueNodeId);
    const projectFieldOptionNodeId = await getValidProjectFieldOptionNodeId(projectId, projectType);

    const fieldValue = await getProjectItemFieldValue(projectNodeId, issueItemNodeId, projectFieldNodeId);
    if (fieldValue === projectType) return;

    await setProjectItemFieldValue(projectNodeId, issueItemNodeId, projectFieldNodeId, projectFieldOptionNodeId);

    logger.info(`[Issue => Project] Issue ${repoName}#${issue.number} now moved to ${projectName} [${projectType}]`);
}

function isValidAction(action: any): boolean {
    return !!action && typeof action === "string" && listenActions.includes(action);
}

function getValidIssue(body: any): any {
    const issue = body.issue;
    if (!issue || !issue.number || !issue.state) throw new Error("Invalid issue data");
    return issue;
}

function getValidProjectName(issue: any): string {
    const projectName = getProjectNameByIssue(issue);
    if (!projectName) throw new Error("Project name not found for the issue");
    return projectName;
}

function getValidIssueRepoName(issue: any): string {
    const repoName = getProjectRepoByIssue(issue);
    if (!repoName) throw new Error("Project name not found for the issue");
    return repoName;
}

function getValidProjectType(label: any): string {
    const projectType = getProjectTypeByLabel(label);
    if (!projectType) throw new Error("Project type not found for the label");
    return projectType;
}

async function getValidIssueNodeId(repoName: string, issueNumber: number): Promise<string> {
    const issueNodeId = await getRepoIssueNodeId(repoName, issueNumber);
    if (!issueNodeId) throw new Error("Issue nodeId not found");
    return issueNodeId;
}

export async function getValidIssueNumber(repoName: string, issueNodeId: string): Promise<number> {
    const issueNumber = await getRepoIssueNumber(repoName, issueNodeId);
    if (issueNumber === undefined) throw new Error("Issue number not found");
    return issueNumber;
}

async function getValidProjectNodeId(projectId: number): Promise<string> {
    const projectNodeId = await getProjectNodeId(projectId);
    if (!projectNodeId) throw new Error("Project nodeId not found");
    return projectNodeId;
}

async function getValidProjectFieldNodeId(projectId: number): Promise<string> {
    const projectFieldNodeId = await getProjectFieldNodeId(projectId, FIELDS.Status);
    if (!projectFieldNodeId) throw new Error("Project field nodeId not found");
    return projectFieldNodeId;
}

async function getValidIssueItemNodeId(projectNodeId: string, issueNodeId: string): Promise<string> {
    const issueItemNodeId = await getOrAddIssueToProject(projectNodeId, issueNodeId);
    if (!issueItemNodeId) throw new Error("Issue item nodeId not found in project");
    return issueItemNodeId;
}

async function getValidProjectFieldOptionNodeId(projectId: number, projectType: string): Promise<string> {
    const projectFieldOptionNodeId = await getProjectFieldOptionNodeId(projectId, FIELDS.Status, projectType);
    if (!projectFieldOptionNodeId) throw new Error("Project field option nodeId not found");
    return projectFieldOptionNodeId;
}

export async function getValidRepoLabelNodeId(repoName: string, labelName: string): Promise<string> {
    const labelNodeId = await getRepoLabelNodeId(repoName, labelName);
    if (!labelNodeId) throw new Error(`Label nodeId not found for ${labelName} in ${repoName}`);
    return labelNodeId;
}

function getLabelFromBodyOrIssue(body: any, issue: any): any {
    let label = body.label;
    if (label) return label;
    return issue.labels.find(
        (it: { name: string }) => typeLabelData.some(
            l => l.labels.includes(it.name),
        ),
    );
}

function getProjectIdByIssue(issue: any): number | undefined {
    const projectName = getProjectNameByIssue(issue);
    return projectData.find(it => it.typeName === projectName)?.projectId;
}

function getProjectNameByIssue(issue: any): string {
    return issue.type.name;
}

function getProjectRepoByIssue(issue: any): string | undefined {
    const projectName = getProjectNameByIssue(issue);
    return projectData.find(it => it.typeName === projectName)?.repo;
}

function getProjectTypeByLabel(label: any): string | undefined {
    if (!label || !label.name) return undefined;

    const labelName = label.name;
    return typeLabelData.find(it => it.labels.includes(labelName))?.type;
}

export async function getRepoIssueNodeId(repoName: string, issueNumber: number): Promise<string | undefined> {
    const cacheKey = `${orgLoginName}:${repoName}:${issueNumber}`;
    const cache = issueNodeIdMap.get(cacheKey);
    if (cache) return cache.toString();
    const query = `
      query($orgLoginName: String!, $repoName: String!, $issueNumber: Int!) {
        organization(login: $orgLoginName) {
          repository(name: $repoName) {
            issue(number: $issueNumber) {
              id
            }
          }
        }
      }
    `;
    const variables = {orgLoginName, repoName, issueNumber};

    const res = await graphql.post("", {query, variables});
    const id = res.data?.data?.organization?.repository?.issue?.id;
    if (!id) return undefined;
    issueNodeIdMap.set(cacheKey, id.toString());
    return id.toString();
}

export async function getRepoIssueNumber(repoName: string, issueNodeId: string): Promise<number | undefined> {
    const cacheKey = `${orgLoginName}:${repoName}:${issueNodeId}`;
    const cache = issueNumberMap.get(cacheKey);
    if (cache) return cache as number;
    const query = `
      query($issueNodeId: ID!) {
        node(id: $issueNodeId) {
          ... on Issue {
            number
          }
        }
      }
    `;
    const variables = {repoName, issueNodeId};
    const res = await graphql.post("", {query, variables});
    const issueNumber = res.data?.data?.node?.number;
    if (!issueNumber || typeof issueNumber !== "number") return undefined;
    issueNumberMap.set(cacheKey, issueNumber);
    return issueNumber;
}

export async function getRepoLabelNodeId(
    repoName: string,
    labelName: string,
): Promise<string | undefined> {
    const cacheKey = `${orgLoginName}:${repoName}:${labelName}`;
    const cache = issueLabelNodeIdMap.get(cacheKey);
    if (cache) return cache.toString();
    const query = `
      query($orgLoginName: String!, $repoName: String!, $labelName: String!) {
        organization(login: $orgLoginName) {
          repository(name: $repoName) {
            label(name: $labelName) {
              id
              name
            }
          }
        }
      }
    `;
    const variables = {orgLoginName, repoName, labelName};

    const res = await graphql.post("", {query, variables});
    const label = res.data?.data?.organization?.repository?.label;
    if (!label?.id) return undefined;
    issueLabelNodeIdMap.set(cacheKey, label.id.toString());
    return label.id.toString();
}

export async function getIssueLabels(repoName: string, issueNumber: number) {
    const query = `
      query($orgLoginName: String!, $repoName: String!, $issueNumber: Int!) {
        organization(login: $orgLoginName) {
          repository(name: $repoName) {
            issue(number: $issueNumber) {
              labels(first: 100) {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;
    const variables = {orgLoginName, repoName, issueNumber};
    const res = await graphql.post("", {query, variables});
    return res.data?.data?.organization?.repository?.issue?.labels?.nodes || [];
}

export async function addLabelToIssue(
    issueNodeId: string,
    labelNodeId: string,
): Promise<void> {
    const query = `
      mutation($labelableId:ID!, $labelIds:[ID!]!) {
        addLabelsToLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
          labelable {
            ... on Issue {
              id
              labels(first: 10) {
                nodes { name }
              }
            }
          }
        }
      }
    `;

    const variables = {
        labelableId: issueNodeId,
        labelIds: [labelNodeId],
    };

    await graphql.post("", {query, variables});
}

export async function removeLabelFromIssue(
    issueNodeId: string,
    labelNodeId: string,
): Promise<void> {
    const query = `
      mutation($labelableId:ID!, $labelIds:[ID!]!) {
        removeLabelsFromLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
          labelable {
            ... on Issue {
              id
              labels(first: 10) {
                nodes { name }
              }
            }
          }
        }
      }
    `;

    const variables = {
        labelableId: issueNodeId,
        labelIds: [labelNodeId],
    };

    await graphql.post("", {query, variables});
}