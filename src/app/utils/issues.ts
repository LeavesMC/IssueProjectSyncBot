import { labelMap, typeMap } from "./config";
import graphql from "./axios";
import { issueNodeIdMap } from "./cache";
import { getOrAddIssueToProject, getProjectFieldNodeId, getProjectNodeId, setProjectItemFieldValue } from "./projects";
import { FIELDS, getProjectFieldOptionNodeId } from "./fields";

const listenActions = [
    "opened",
    "reopened",
    "labeled",
];

export async function handleIssueEvent(body: any): Promise<string | undefined> {
    const action = body.action;
    if (!action || typeof action != "string" || !listenActions.includes(action)) return;

    const issue = body.issue;
    const projectId = getProjectIdByIssue(issue);
    if (!projectId) return "Invalid project ID";

    const label = getLabelFromBodyOrIssue(body, issue);
    const projectType = getProjectTypeByLabel(label);
    if (!projectType) return "Invalid project type";

    const repoFullName = body.repository.full_name;
    if (!repoFullName) return "Invalid repository full name";
    const repoName = repoFullName.split("/")[1];
    if (!repoName) return "Invalid repository name";

    const orgLoginName = body.organization.login;
    if (!orgLoginName || typeof orgLoginName !== "string") return "Invalid organization login name";
    switch (action) {
        case "labeled":
        case "reopened": {
            const issueNodeId = await getRepoIssueNodeId(orgLoginName, repoName, issue.number);
            if (!issueNodeId) return "Invalid issue node ID";

            const projectNodeId = await getProjectNodeId(orgLoginName, projectId);
            if (!projectNodeId) return "Invalid project node ID";

            const projectFieldNodeId = await getProjectFieldNodeId(orgLoginName, projectId, FIELDS.Status);
            if (!projectFieldNodeId) return "Invalid project field node ID";

            const issueItemNodeId = await getOrAddIssueToProject(projectNodeId, issueNodeId);
            if (!issueItemNodeId) return "Failed to add issue to project";

            const projectFieldOptionNodeId = await getProjectFieldOptionNodeId(orgLoginName, projectId, FIELDS.Status, projectType);
            if (!projectFieldOptionNodeId) return "Invalid project field option node ID";

            await setProjectItemFieldValue(projectNodeId, issueItemNodeId, projectFieldNodeId, projectFieldOptionNodeId);

            console.log(`Issue ${issue.number} in repository ${repoName} has been updated with project type ${projectType}.`);
        }
    }
    return "Success";
}

function getLabelFromBodyOrIssue(body: any, issue: any): string {
    let label = body.label;
    if (label) return label;
    return issue.labels.find(
        (it: { name: string }) => labelMap.some(
            l => l.labels.includes(it.name),
        ),
    ).name;
}

function getProjectIdByIssue(issue: any): number | undefined {
    if (!issue || !issue.state || !issue.type || !issue.type.name) return undefined;
    if (issue.state !== "open") return undefined;

    const typeName = issue.type.name;
    return typeMap.find(it => it.name === typeName)?.projectId;
}

function getProjectTypeByLabel(label: any): string | undefined {
    if (!label || !label.name) return undefined;

    const labelName = label.name;
    return labelMap.find(it => it.labels.includes(labelName))?.type;
}

export async function getRepoIssueNodeId(orgLoginName: string, repoName: string, issueNumber: number): Promise<string | undefined> {
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