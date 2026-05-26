"use client";

import { useMemo, useState } from "react";
import {
    createTaskFromTemplate,
    members,
    statusLabel,
    templates,
    type Task
} from "../lib/task-model";

const defaultTemplateId = templates[0]?.id ?? "";
const defaultAssigneeId = members.find((member) => member.role === "cleaner")?.id ?? "";

export default function Home() {
    const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
        defaultAssigneeId ? [defaultAssigneeId] : []
    );
    const [taskNote, setTaskNote] = useState("Handle before 10:00 AM and attach a photo if the area needs rework.");
    const [tasks, setTasks] = useState<Task[]>([
        createTaskFromTemplate(templates[0], ["u3"], "Maya", "Start with front desk and main entry mat."),
        {
            ...createTaskFromTemplate(templates[1], ["u5"], "Omar", "Check paper and soap levels."),
            status: "done",
            completedAt: new Date().toISOString()
        }
    ]);

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

    const activeTasks = useMemo(() => {
        return tasks.filter((task) => task.status !== "done");
    }, [tasks]);

    const doneTasks = useMemo(() => {
        return tasks.filter((task) => task.status === "done");
    }, [tasks]);

    const toggleAssignee = (memberId: string) => {
        setSelectedAssigneeIds((current) =>
            current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
        );
    };

    const handleCreateTask = () => {
        if (!selectedTemplate) {
            return;
        }

        const newTask = createTaskFromTemplate(selectedTemplate, selectedAssigneeIds, "Maya", taskNote);
        setTasks((current) => [newTask, ...current]);
    };

    const markComplete = (taskId: string) => {
        setTasks((current) =>
            current.map((task) =>
                task.id === taskId
                    ? { ...task, status: "done", completedAt: new Date().toISOString() }
                    : task
            )
        );
    };

    return (
        <main className="page-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Feature 1</p>
                    <h1>Daily cleaning task assignment and completion</h1>
                    <p className="hero-copy">
                        One admin can assign one or many cleaners today, while the data model stays ready for a future shift to
                        team-based assignments.
                    </p>
                </div>

                <div className="hero-stats">
                    <article>
                        <strong>{tasks.length}</strong>
                        <span>Total tasks</span>
                    </article>
                    <article>
                        <strong>{activeTasks.length}</strong>
                        <span>Open tasks</span>
                    </article>
                    <article>
                        <strong>{doneTasks.length}</strong>
                        <span>Completed</span>
                    </article>
                </div>
            </section>

            <section className="layout-grid">
                <article className="panel-card">
                    <h2>Create task</h2>
                    <p className="panel-copy">Choose a template, pick one or many assignees, and create the daily job.</p>

                    <label className="field-label" htmlFor="template">
                        Task template
                    </label>
                    <select id="template" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                        {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.title} · {template.area}
                            </option>
                        ))}
                    </select>

                    <div className="field-group">
                        <span className="field-label">Assign to cleaner(s)</span>
                        <div className="member-grid">
                            {members
                                .filter((member) => member.role === "cleaner")
                                .map((member) => {
                                    const checked = selectedAssigneeIds.includes(member.id);

                                    return (
                                        <label className={`member-chip ${checked ? "member-chip-active" : ""}`} key={member.id}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleAssignee(member.id)}
                                            />
                                            <span>
                                                {member.name}
                                                <small>{member.zone}</small>
                                            </span>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    <label className="field-label" htmlFor="note">
                        Completion note
                    </label>
                    <textarea
                        id="note"
                        value={taskNote}
                        onChange={(event) => setTaskNote(event.target.value)}
                        rows={4}
                    />

                    <button className="primary-button" type="button" onClick={handleCreateTask}>
                        Create assignment
                    </button>
                </article>

                <article className="panel-card">
                    <h2>Flexible assignment model</h2>
                    <p className="panel-copy">The task stores assignee IDs as an array so 1-to-many works later without schema churn.</p>

                    <div className="model-box">
                        <code>task.assigneeIds: string[]</code>
                        <p>
                            Current UI supports one cleaner or multiple cleaners. Future updates can add group ownership, reassignment,
                            or split work without changing the core relation.
                        </p>
                    </div>

                    <div className="status-grid">
                        <article>
                            <span>Template</span>
                            <strong>{selectedTemplate?.title}</strong>
                        </article>
                        <article>
                            <span>Area</span>
                            <strong>{selectedTemplate?.area}</strong>
                        </article>
                        <article>
                            <span>Priority</span>
                            <strong>{selectedTemplate?.defaultPriority}</strong>
                        </article>
                    </div>
                </article>
            </section>

            <section className="panel-card">
                <h2>Task board</h2>
                <div className="task-list">
                    {tasks.map((task) => (
                        <article className="task-item" key={task.id}>
                            <div>
                                <p className="task-title">{task.title}</p>
                                <p className="task-meta">
                                    {task.area} · {task.priority} · {statusLabel(task.status)}
                                </p>
                                <p className="task-meta">
                                    Assigned to {task.assigneeIds.map((id) => members.find((member) => member.id === id)?.name ?? id).join(
                                        ", "
                                    )}
                                </p>
                                {task.note ? <p className="task-note">{task.note}</p> : null}
                            </div>

                            {task.status !== "done" ? (
                                <button className="secondary-button" type="button" onClick={() => markComplete(task.id)}>
                                    Mark done
                                </button>
                            ) : (
                                <span className="done-pill">Completed</span>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
