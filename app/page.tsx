"use client";

import { useEffect, useMemo, useState } from "react";
import { getRolePermissions, roleLabel } from "../lib/access-control";
import {
    createSeedTasks,
    createTaskFromTemplate,
    members,
    statusLabel,
    templates,
    type Role,
    type Task
} from "../lib/task-model";
import {
    ensureUserProfile,
    getCurrentSession,
    hasSupabaseAuth,
    onAuthStateChanged,
    signInWithMagicLink,
    signOut,
    type UserProfile
} from "../services/auth-service";
import {
    createTaskRepository,
    type RepositoryMode,
    type TaskRepository
} from "../services/task-repository";

const defaultTemplateId = templates[0]?.id ?? "";
const defaultAssigneeId = members.find((member) => member.role === "cleaner")?.id ?? "";

export default function Home() {
    const [repository, setRepository] = useState<TaskRepository>(() => createTaskRepository());
    const [activeRole, setActiveRole] = useState<Role>("cleaner");
    const [activeMemberId, setActiveMemberId] = useState(defaultAssigneeId || "u3");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [authEmail, setAuthEmail] = useState("");
    const [authPending, setAuthPending] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [supabaseAuthEnabled] = useState(() => hasSupabaseAuth());
    const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
        defaultAssigneeId ? [defaultAssigneeId] : []
    );
    const [taskNote, setTaskNote] = useState("Handle before 10:00 AM and attach a photo if the area needs rework.");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [storageMode, setStorageMode] = useState<RepositoryMode>(repository.mode);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);

    const permissions = useMemo(() => getRolePermissions(activeRole), [activeRole]);
    const currentMember = useMemo(() => members.find((member) => member.id === activeMemberId) ?? members[0], [activeMemberId]);

    const visibleTasks = useMemo(
        () => tasks.filter((task) => permissions.canViewTask(task, currentMember.id)),
        [tasks, permissions, currentMember.id]
    );

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

    const activeTasks = useMemo(() => {
        return visibleTasks.filter((task) => task.status !== "done");
    }, [visibleTasks]);

    const doneTasks = useMemo(() => {
        return visibleTasks.filter((task) => task.status === "done");
    }, [visibleTasks]);

    useEffect(() => {
        if (!supabaseAuthEnabled) {
            setAuthReady(true);
            setIsAuthenticated(true);
            setActiveRole("admin");
            setActiveMemberId("u1");
            setNotice("Supabase auth is not configured. Running in demo admin mode.");
            return;
        }

        let active = true;
        const fallbackMemberId = defaultAssigneeId || "u3";

        const syncSession = async () => {
            try {
                const session = await getCurrentSession();

                if (!active) {
                    return;
                }

                if (!session?.user) {
                    setIsAuthenticated(false);
                    setProfile(null);
                    setNotice("Sign in with your work email to load tasks.");
                    return;
                }

                const userProfile = await ensureUserProfile(session.user, fallbackMemberId);
                if (!active) {
                    return;
                }

                setProfile(userProfile);
                setIsAuthenticated(true);
                setActiveRole(userProfile.role);
                setActiveMemberId(userProfile.memberId || fallbackMemberId);
                setNotice(`Signed in as ${userProfile.displayName} (${roleLabel(userProfile.role)}).`);
            } catch {
                if (!active) {
                    return;
                }

                setIsAuthenticated(false);
                setProfile(null);
                setNotice("Could not verify your session. Please sign in again.");
            } finally {
                if (active) {
                    setAuthReady(true);
                }
            }
        };

        void syncSession();

        const unsubscribe = onAuthStateChanged(() => {
            void syncSession();
        });

        return () => {
            active = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [supabaseAuthEnabled]);

    useEffect(() => {
        let active = true;

        const loadTasks = async () => {
            if (!authReady) {
                return;
            }

            if (supabaseAuthEnabled && !isAuthenticated) {
                setLoadingTasks(false);
                setTasks([]);
                return;
            }

            setLoadingTasks(true);

            try {
                const savedTasks = await repository.listTasks();

                if (savedTasks.length === 0) {
                    const seedTasks = createSeedTasks();
                    await Promise.all(seedTasks.map((task) => repository.saveTask(task)));

                    if (active) {
                        setTasks(seedTasks);
                    }
                } else if (active) {
                    setTasks(savedTasks);
                }

                if (active) {
                    setStorageMode(repository.mode);
                    setNotice(repository.mode === "supabase" ? "Connected to Supabase storage." : "Using browser local storage.");
                }
            } catch {
                if (active) {
                    setNotice(repository.mode === "supabase" ? "Could not load tasks from Supabase." : "Could not load saved tasks.");
                }
            } finally {
                if (active) {
                    setLoadingTasks(false);
                }
            }
        };

        void loadTasks();

        return () => {
            active = false;
        };
    }, [repository, authReady, isAuthenticated, supabaseAuthEnabled]);

    const toggleAssignee = (memberId: string) => {
        setSelectedAssigneeIds((current) =>
            current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
        );
    };

    const handleCreateTask = async () => {
        if (!selectedTemplate || !permissions.canCreateTask) {
            return;
        }

        const actorName = profile?.displayName || currentMember.name;
        const newTask = createTaskFromTemplate(selectedTemplate, selectedAssigneeIds, actorName, taskNote);
        setTasks((current) => [newTask, ...current]);

        try {
            await repository.saveTask(newTask);
        } catch {
            setNotice("Task created in UI, but save failed. Check storage connection.");
        }
    };

    const markComplete = async (taskId: string) => {
        let updatedTask: Task | null = null;

        setTasks((current) =>
            current.map((task) => {
                if (task.id !== taskId) {
                    return task;
                }

                if (!permissions.canCompleteTask(task, currentMember.id)) {
                    return task;
                }

                updatedTask = { ...task, status: "done", completedAt: new Date().toISOString() };
                return updatedTask;
            })
        );

        if (!updatedTask) {
            return;
        }

        try {
            await repository.saveTask(updatedTask);
        } catch {
            setNotice("Status updated in UI, but save failed. Check storage connection.");
        }
    };

    const handleMagicLinkSignIn = async () => {
        if (!authEmail.trim()) {
            setNotice("Enter your email to continue.");
            return;
        }

        setAuthPending(true);
        try {
            await signInWithMagicLink(authEmail.trim());
            setNotice("Magic link sent. Check your inbox and open the sign-in link.");
        } catch {
            setNotice("Could not send magic link. Verify your email auth setup in Supabase.");
        } finally {
            setAuthPending(false);
        }
    };

    const handleSignOut = async () => {
        setAuthPending(true);
        try {
            await signOut();
            setTasks([]);
            setNotice("Signed out.");
        } catch {
            setNotice("Could not sign out right now.");
        } finally {
            setAuthPending(false);
        }
    };

    return (
        <main className="page-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Feature 4</p>
                    <h1>Daily cleaning task assignment and completion</h1>
                    <p className="hero-copy">
                        Authenticated users receive role-based task access from Supabase profiles. Cleaners only see and complete
                        their assigned work.
                    </p>
                    {supabaseAuthEnabled && !isAuthenticated ? (
                        <div className="auth-box">
                            <label className="field-label" htmlFor="auth-email">
                                Work email
                            </label>
                            <input
                                id="auth-email"
                                type="email"
                                value={authEmail}
                                onChange={(event) => setAuthEmail(event.target.value)}
                                placeholder="you@company.com"
                            />
                            <button className="primary-button" type="button" onClick={handleMagicLinkSignIn} disabled={authPending}>
                                {authPending ? "Sending..." : "Send magic link"}
                            </button>
                        </div>
                    ) : (
                        <div className="auth-summary">
                            <p className="task-meta">
                                Signed in as {profile?.displayName || currentMember.name} ({roleLabel(activeRole)})
                            </p>
                            {supabaseAuthEnabled ? (
                                <button className="secondary-button" type="button" onClick={handleSignOut} disabled={authPending}>
                                    Sign out
                                </button>
                            ) : null}
                        </div>
                    )}
                    <p className="mode-pill">Storage: {storageMode === "supabase" ? "Supabase" : "Local"}</p>
                    {notice ? <p className="notice-text">{notice}</p> : null}
                </div>

                <div className="hero-stats">
                    <article>
                        <strong>{visibleTasks.length}</strong>
                        <span>Visible tasks</span>
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
                    <p className="panel-copy">
                        {permissions.canCreateTask
                            ? "Choose a template, pick one or many assignees, and create the daily job."
                            : "Cleaners can view and complete assigned tasks but cannot create new assignments."}
                    </p>

                    <p className="task-meta">
                        Current identity: {currentMember.name} ({roleLabel(activeRole)})
                    </p>

                    <label className="field-label" htmlFor="template">
                        Task template
                    </label>
                    <select
                        id="template"
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        disabled={!permissions.canCreateTask}
                    >
                        {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.title} · {template.area}
                            </option>
                        ))}
                    </select>

                    {permissions.canAssignTask ? (
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
                    ) : null}

                    {permissions.canCreateTask ? (
                        <>
                            <label className="field-label" htmlFor="note">
                                Completion note
                            </label>
                            <textarea
                                id="note"
                                value={taskNote}
                                onChange={(event) => setTaskNote(event.target.value)}
                                rows={4}
                                disabled={!permissions.canCreateTask}
                            />
                        </>
                    ) : null}

                    {permissions.canCreateTask ? (
                        <button className="primary-button" type="button" onClick={handleCreateTask}>
                            Create assignment
                        </button>
                    ) : null}
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
                {!authReady ? <p className="task-meta">Checking session...</p> : null}
                {loadingTasks ? <p className="task-meta">Loading tasks...</p> : null}
                <div className="task-list">
                    {visibleTasks.map((task) => (
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

                            {task.status !== "done" && permissions.canCompleteTask(task, currentMember.id) ? (
                                <button className="secondary-button" type="button" onClick={() => markComplete(task.id)}>
                                    Mark done
                                </button>
                            ) : task.status !== "done" ? (
                                <span className="task-meta">No permission</span>
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
