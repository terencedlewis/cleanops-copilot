import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import type { Role } from "../lib/task-model";

export type UserProfile = {
    id: string;
    role: Role;
    displayName: string;
    memberId: string;
};

type ProfileRow = {
    id: string;
    role: Role;
    display_name: string;
    member_id: string;
};

function toProfile(row: ProfileRow): UserProfile {
    return {
        id: row.id,
        role: row.role,
        displayName: row.display_name,
        memberId: row.member_id
    };
}

function getClient(): SupabaseClient | null {
    return getSupabaseBrowserClient();
}

export function hasSupabaseAuth(): boolean {
    return getClient() !== null;
}

export async function getCurrentSession(): Promise<Session | null> {
    const client = getClient();
    if (!client) {
        return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
        throw error;
    }

    return data.session;
}

export function onAuthStateChanged(callback: (session: Session | null) => void): (() => void) | null {
    const client = getClient();
    if (!client) {
        return null;
    }

    const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });

    return () => {
        data.subscription.unsubscribe();
    };
}

export async function signInWithMagicLink(email: string): Promise<void> {
    const client = getClient();
    if (!client) {
        throw new Error("Supabase is not configured.");
    }

    const { error } = await client.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined
        }
    });

    if (error) {
        throw error;
    }
}

export async function signOut(): Promise<void> {
    const client = getClient();
    if (!client) {
        return;
    }

    const { error } = await client.auth.signOut();
    if (error) {
        throw error;
    }
}

export async function ensureUserProfile(user: User, fallbackMemberId: string): Promise<UserProfile> {
    const client = getClient();
    if (!client) {
        throw new Error("Supabase is not configured.");
    }

    const { data, error } = await client
        .from("profiles")
        .select("id, role, display_name, member_id")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (data) {
        return toProfile(data as ProfileRow);
    }

    const displayName = user.email ? user.email.split("@")[0] : "team-member";
    const insertRow = {
        id: user.id,
        role: "cleaner" as Role,
        display_name: displayName,
        member_id: fallbackMemberId
    };

    const { data: inserted, error: insertError } = await client
        .from("profiles")
        .insert(insertRow)
        .select("id, role, display_name, member_id")
        .single();

    if (insertError) {
        throw insertError;
    }

    return toProfile(inserted as ProfileRow);
}