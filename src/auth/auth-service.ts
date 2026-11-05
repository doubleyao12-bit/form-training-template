import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../data/supabase/client";

export const authService = {
  async getSession() {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    return data.session;
  },
  async signIn(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },
  async signUp(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) throw error;
    return data.session;
  },
  async changePassword(email: string, currentPassword: string, nextPassword: string) {
    const client = getSupabaseClient();
    const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) throw new Error("当前密码不正确。");
    const { error } = await client.auth.updateUser({ password: nextPassword });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  },
  onChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return getSupabaseClient().auth.onAuthStateChange(callback).data.subscription;
  },
};
