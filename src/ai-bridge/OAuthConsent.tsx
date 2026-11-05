import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { OAuthAuthorizationDetails, Session } from "@supabase/supabase-js";
import { authService } from "../auth/auth-service";
import { getSupabaseClient } from "../data/supabase/client";

type State = "loading" | "signin" | "consent" | "working" | "error";

export default function OAuthConsent() {
  const authorizationId = new URLSearchParams(window.location.search).get("authorization_id") ?? "";
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<State>("loading");
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void authService.getSession().then(value => {
      if (!active) return;
      setSession(value);
      setState(value ? "loading" : "signin");
    }).catch(cause => fail(cause));
    const subscription = authService.onChange((_event, value) => {
      if (!active) return;
      setSession(value);
      setState(value ? "loading" : "signin");
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session || !authorizationId || state !== "loading") return;
    void getSupabaseClient().auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: cause }) => {
      if (cause) throw cause;
      if (!data) throw new Error("无法读取授权请求。");
      if ("redirect_url" in data) {
        window.location.assign(data.redirect_url);
        return;
      }
      setDetails(data);
      setState("consent");
    }).catch(cause => fail(cause));
  }, [authorizationId, session, state]);

  function fail(cause: unknown) {
    setError(cause instanceof Error ? cause.message : "授权请求失败。");
    setState("error");
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setState("working"); setError("");
    try { await authService.signIn(email.trim(), password); setState("loading"); }
    catch (cause) { fail(cause); }
  }

  async function decide(action: "approve" | "deny") {
    if (!details) return;
    setState("working"); setError("");
    try {
      const response = action === "approve"
        ? await getSupabaseClient().auth.oauth.approveAuthorization(details.authorization_id, { skipBrowserRedirect: true })
        : await getSupabaseClient().auth.oauth.denyAuthorization(details.authorization_id, { skipBrowserRedirect: true });
      if (response.error || !response.data?.redirect_url) throw response.error ?? new Error("授权响应缺少返回地址。");
      window.location.assign(response.data.redirect_url);
    } catch (cause) { fail(cause); }
  }

  if (!authorizationId) return <ConsentShell><h1>授权请求无效</h1><p>缺少 authorization_id，请从 ChatGPT 重新连接 FORM。</p></ConsentShell>;
  if (state === "signin") return <ConsentShell>
    <p className="kicker">FORM · READ ONLY</p>
    <h1>连接你的 FORM 账户</h1>
    <p>登录后，你可以明确决定是否允许此应用读取当前训练计划。</p>
    <form onSubmit={signIn}>
      <label>邮箱<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>密码<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="primary">登录并继续</button>
    </form>
  </ConsentShell>;
  if (state === "error") return <ConsentShell><p className="kicker">FORM</p><h1>无法完成授权</h1><p className="error-copy">{error}</p></ConsentShell>;
  if (!details || state === "loading") return <ConsentShell><p className="kicker">FORM</p><h1>正在确认授权请求…</h1></ConsentShell>;
  return <ConsentShell>
    <p className="kicker">FORM · READ ONLY</p>
    <h1>允许访问训练计划？</h1>
    <p><strong>{details.client.name}</strong> 请求读取你当前的 FORM 训练计划。</p>
    <ul><li>可读取当前 Plan、Sessions、训练意图和处方</li><li>不能创建、修改或删除任何训练数据</li><li>不能访问其他 FORM 用户的数据</li></ul>
    <p className="oauth-account">当前账户：{details.user.email}</p>
    <div className="oauth-actions">
      <button type="button" onClick={() => void decide("deny")} disabled={state === "working"}>拒绝</button>
      <button type="button" className="primary" onClick={() => void decide("approve")} disabled={state === "working"}>允许只读访问</button>
    </div>
  </ConsentShell>;
}

function ConsentShell({ children }: { children: ReactNode }) {
  return <main className="auth-screen oauth-consent"><section>{children}</section></main>;
}
