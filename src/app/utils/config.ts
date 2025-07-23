export const orgLoginName = "LeavesMC"

export const projectData = [
    {
        typeName: "Bug",
        projectId: 8,
        repo: "Leaves",
    },
    {
        typeName: "Feature",
        projectId: 9,
        repo: "Leaves"
    },
];

export const typeLabelData = [
    {
        type: "🕑 Needs Triage",
        labels: ["status: needs triage"],
    },
    {
        type: "⌛ Awaiting Response",
        labels: ["resolution: awaiting response", "status: needs testing", "status: distribute to upstream"],
    },
    {
        type: "⏳ Awaiting Merging",
        labels: ["status: awaiting merging"],
    },
    {
        type: "🔨 Working",
        labels: ["status: in progress", "status: blocked"],
    },
    {
        type: "✅ Accepted",
        labels: ["status: accepted"],
    },
];

export const allStatusLabels = typeLabelData.flatMap(it => it.labels);