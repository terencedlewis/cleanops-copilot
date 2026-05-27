import type { Role, Task } from "./task-model";

export type RolePermissions = {
    canCreateTask: boolean;
    canAssignTask: boolean;
    canCompleteTask: (task: Task, activeMemberId: string) => boolean;
    canViewTask: (task: Task, activeMemberId: string) => boolean;
};

export function getRolePermissions(role: Role): RolePermissions {
    if (role === "cleaner") {
        return {
            canCreateTask: false,
            canAssignTask: false,
            canCompleteTask: (task, activeMemberId) => task.assigneeIds.includes(activeMemberId),
            canViewTask: (task, activeMemberId) => task.assigneeIds.includes(activeMemberId)
        };
    }

    return {
        canCreateTask: true,
        canAssignTask: true,
        canCompleteTask: () => true,
        canViewTask: () => true
    };
}

export function roleLabel(role: Role): string {
    if (role === "admin") {
        return "Admin";
    }

    if (role === "supervisor") {
        return "Supervisor";
    }

    return "Cleaner";
}