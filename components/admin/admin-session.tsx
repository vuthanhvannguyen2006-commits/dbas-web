"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminRole = "admin" | "editor";

type SessionState = {
  status: "loading" | "signed-out" | "signed-in" | "unconfigured";
  email: string | null;
  role: AdminRole | null;
  signOut: () => Promise<void>;
};

const AdminSessionContext = createContext<SessionState>({
  status: "loading",
  email: null,
  role: null,
  signOut: async () => {},
});

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  // Whether Supabase is configured is knowable at module load, so it is the
  // initial state rather than something an effect discovers and re-renders for.
  const [status, setStatus] = useState<SessionState["status"]>(
    supabase ? "loading" : "unconfigured"
  );
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    let active = true;

    async function apply(userId: string | undefined, userEmail: string | null) {
      if (!userId) {
        if (!active) return;
        setEmail(null);
        setRole(null);
        setStatus("signed-out");
        return;
      }

      // The role comes from the database, not from anything the browser holds.
      // Hiding a tab is convenience; the policies in 0001_initial_schema.sql
      // are what actually stop an editor writing to team_members.
      const { data } = await sb!
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;
      setEmail(userEmail);
      setRole((data?.role as AdminRole) ?? null);
      setStatus("signed-in");
    }

    sb.auth.getSession().then(({ data }) => {
      apply(data.session?.user.id, data.session?.user.email ?? null);
    });

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.id, session?.user.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <AdminSessionContext.Provider value={{ status, email, role, signOut }}>
      {children}
    </AdminSessionContext.Provider>
  );
}
