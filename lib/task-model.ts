export type Role = "admin" | "supervisor" | "cleaner";

export type TaskStatus = "pending" | "in-progress" | "done";

export type Member = {
    id: string;
    name: string;
    role: Role;
    zone: string;
};

export type TaskTemplate = {
    id: string;
    title: string;
    area: string;
    defaultPriority: "low" | "medium" | "high";
};

export type Task = {
    id: string;
    title: string;
    area: string;
    priority: "low" | "medium" | "high";
    status: TaskStatus;
    assigneeIds: string[];
    createdBy: string;
    assignedAt: string;
    completedAt: string | null;
    note: string;
};

export const members: Member[] = [
    { id: "u1", name: "Maya", role: "admin", zone: "Operations" },
    { id: "u2", name: "Omar", role: "supervisor", zone: "Lobby / Floors" },
    { id: "u3", name: "Asha", role: "cleaner", zone: "Lobby" },
    { id: "u4", name: "Noah", role: "cleaner", zone: "Floors" },
    { id: "u5", name: "Lina", role: "cleaner", zone: "Washrooms" }
];

export const templates: TaskTemplate[] = [
    { id: "t1", title: "Sanitize front desk", area: "Lobby", defaultPriority: "high" },
    { id: "t2", title: "Restock washroom supplies", area: "Washrooms", defaultPriority: "medium" },
    { id: "t3", title: "Vacuum main corridor", area: "Floors", defaultPriority: "medium" }
];

export function createSeedTasks(): Task[] {
    return [
        createTaskFromTemplate(templates[0], ["u3"], "Maya", "Start with front desk and main entry mat."),
        {
            ...createTaskFromTemplate(templates[1], ["u5"], "Omar", "Check paper and soap levels."),
            status: "done",
            completedAt: new Date().toISOString()
        }
    ];
}

export function createTaskFromTemplate(template: TaskTemplate, assigneeIds: string[], createdBy: string, note = ""): Task {
    const now = new Date().toISOString();

    return {
        id: `${template.id}-${Date.now()}`,
        title: template.title,
        area: template.area,
        priority: template.defaultPriority,
        status: assigneeIds.length > 0 ? "in-progress" : "pending",
        assigneeIds,
        createdBy,
        assignedAt: now,
        completedAt: null,
        note
    };
}

export function statusLabel(status: TaskStatus): string {
    switch (status) {
        case "pending":
            return "Pending";
        case "in-progress":
            return "In progress";
        case "done":
            return "Done";
    }
}
