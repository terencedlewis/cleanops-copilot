import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import type { Task } from "../lib/task-model";

const STORAGE_KEY = "cleanops.tasks.v1";

export type RepositoryMode = "supabase" | "local";

type TaskRow = {
    id: string;
    title: string;
    area: string;
    priority: Task["priority"];
    status: Task["status"];
    assignee_ids: string[];
    created_by: string;
    assigned_at: string;
    completed_at: string | null;
    note: string;
};

export type TaskRepository = {
    mode: RepositoryMode;
    listTasks: () => Promise<Task[]>;
    saveTask: (task: Task) => Promise<void>;
};

function toTaskRow(task: Task): TaskRow {
    return {
        id: task.id,
        title: task.title,
        area: task.area,
        priority: task.priority,
        status: task.status,
        assignee_ids: task.assigneeIds,
        created_by: task.createdBy,
        assigned_at: task.assignedAt,
        completed_at: task.completedAt,
        note: task.note
    };
}

function fromTaskRow(row: TaskRow): Task {
    return {
        id: row.id,
        title: row.title,
        area: row.area,
        priority: row.priority,
        status: row.status,
        assigneeIds: row.assignee_ids,
        createdBy: row.created_by,
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
        note: row.note
    };
}

function createLocalRepository(): TaskRepository {
    return {
        mode: "local",
        async listTasks() {
            if (typeof window === "undefined") {
                return [];
            }

            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }

            try {
                const parsed = JSON.parse(raw) as Task[];
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        },
        async saveTask(task) {
            if (typeof window === "undefined") {
                return;
            }

            const current = await this.listTasks();
            const next = [task, ...current.filter((existing) => existing.id !== task.id)];
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
    };
}

function createSupabaseRepository(): TaskRepository {
    const client = getSupabaseBrowserClient();

    if (!client) {
        return createLocalRepository();
    }

    return {
        mode: "supabase",
        async listTasks() {
            const { data, error } = await client
                .from("tasks")
                .select("*")
                .order("assigned_at", { ascending: false });

            if (error) {
                throw error;
            }

            return (data as TaskRow[]).map(fromTaskRow);
        },
        async saveTask(task) {
            const { error } = await client
                .from("tasks")
                .upsert(toTaskRow(task), { onConflict: "id" });

            if (error) {
                throw error;
            }
        }
    };
}

export function createTaskRepository(): TaskRepository {
    return createSupabaseRepository();
}

export function createFallbackTaskRepository(): TaskRepository {
    return createLocalRepository();
}