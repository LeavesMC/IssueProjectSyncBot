export const orgLoginName = "Xor7Studio"

export const projectData = [
    {
        name: "Feature",
        projectId: 1,
        repo: "Leaves-ci-test"
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