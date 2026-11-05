import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { authService } from "./auth/auth-service";
import { getTrainingRepositories } from "./data/supabase/repositories";
import { hasSupabaseConfig } from "./data/supabase/client";
import { exerciseLibraryV1 } from "./library-v1";
import { equipmentVocabulary, movementPatterns, type MovementPattern } from "./types";
import type {
  ReplacementReason,
  TrainingPlaybook,
  TrainingPlanAggregate,
  TrainingPlanDraft,
  TrainingPrescription,
  WorkoutExercise,
  WorkoutRunAggregate,
  WorkoutRunSummary,
  WorkoutSet,
  WorkoutSetPatch,
} from "./domain/training";
import { createExampleTrainingPlan, examplePlaybookV01 } from "./training-playbook";
import {
  canFinishWorkout,
  nextPendingExercise,
  resolveNextSession,
} from "./core-loop";
import {
  journalWorkoutWrite,
  readPendingWorkoutWrites,
  removeWorkoutWrite,
} from "./pending-journal";
import { rankSubstitutions } from "./substitution";
import HardenedWorkoutScreen from "./WorkoutScreen";
import { getConcreteVariationDisplay, getVariationDisplay, getVariationMetadata, getWorkoutExerciseDisplay } from "./exercise-display";
import { exerciseFamilyGroups } from "./exercise-family";
import { formatPerformance } from "./load-tracking";
import { formatMeasuredPerformance } from "./measurement";
import { ExercisePicker } from "./ExercisePicker";
import {ExerciseOrder} from './ExerciseOrder';
import { exerciseBodyCategories, exerciseBodyCategoryIds, exerciseBrowseCategories, exerciseBrowseCategory, movementPatternLabels as patternLabels } from "./exercise-taxonomy";
import { warmupActions, warmupIntentLabels } from "./warmup";
import { resolveSessionWarmup } from "./warmup-resolver";
import { RECOVERY_PLAN_NAME } from "./recovery-plan";
import { applyValidatedPlanImport, formatImportedPrescription, parseAndValidatePlanImport, type PlanImportIssue, type PlanImportResult } from "./plan-import";
import { PlanEditor } from "./PlanEditor";
import { buildTrainingReview, type TrainingReview } from "./training-review";
import { loadTrainingReviewEvidence } from "./training-review-loader";
import {occurrenceWarmupKey} from './flexible-training';
import {matchesAction} from './catalog-search';
import {AddWorkoutAction,RemoveWorkoutAction} from './WorkoutActions';
import type {MeasurementAdjustment} from './replacement-engine';
import type {WorkoutChangeScope} from './domain/training';
import {emptyWarmupProgress,readWarmupProgress,type WarmupProgress} from './warmup-occurrence';

type Tab = "today" | "plan" | "exercises" | "history" | "profile";
type LoadState = "loading" | "ready" | "error";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "plan", label: "Plan" },
  { id: "exercises", label: "Exercises" },
  { id: "history", label: "History" },
  { id: "profile", label: "Profile" },
];
const repos = () => getTrainingRepositories();
const PerformanceProfile = lazy(() => import('./PerformanceProfile'));

class AppErrorBoundary extends Component<{children:ReactNode},{error:string}> {
  state={error:""};
  static getDerivedStateFromError(error:unknown){return {error:error instanceof Error?error.message:"页面加载异常"};}
  componentDidCatch(error:Error, info:ErrorInfo){console.error("Training Hub render error",error,info.componentStack);}
  render(){if(this.state.error)return <main className="app-recovery"><section><small>FORM</small><h1>页面加载遇到问题</h1><p>{this.state.error}</p><button onClick={()=>window.location.reload()}>重新加载</button></section></main>;return this.props.children;}
}

export default function CloudTrainingApp() { return <AppErrorBoundary><CloudTrainingAppContent /></AppErrorBoundary>; }

function CloudTrainingAppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setAuthReady(true);
      return;
    }
    void authService.getSession().then((value) => {
      setSession(value);
      setAuthReady(true);
    });
    const sub = authService.onChange((_event, value) => {
      setSession(value);
      setAuthReady(true);
    });
    return () => sub.unsubscribe();
  }, []);
  if (!hasSupabaseConfig())
    return (
      <Message title="Cloud configuration missing">
        配置公开 Supabase URL 与 anon key 后重新启动。
      </Message>
    );
  if (!authReady)
    return <Message title="正在恢复训练数据">正在确认安全会话…</Message>;
  if (!session) return <AuthScreen />;
  return <AuthenticatedApp session={session} />;
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        if (password !== confirmation) throw new Error("两次输入的密码不一致。");
        const session = await authService.signUp(email.trim(), password);
        if (!session) {
          setNotice("注册成功。请先前往邮箱完成确认，再返回登录。");
          setMode("signin");
          setPassword("");
          setConfirmation("");
        }
      } else {
        await authService.signIn(email.trim(), password);
      }
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <section>
        <p className="kicker">FORM</p>
        <h1>{mode === "signin" ? "回到训练。" : "建立你的训练档案。"}</h1>
        <p>{mode === "signin" ? "你的计划、正在进行的训练和历史记录会安全保存在云端。" : "一个账户，让训练进度在电脑和手机之间保持连续。"}</p>
        <div className="auth-mode" aria-label="账户操作">
          <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); setNotice(""); }}>登录</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>注册</button>
        </div>
        <form onSubmit={submit}>
          <label>
            邮箱
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === "signup" && <label>
            确认密码
            <input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>}
          {error && <p className="error-copy">{error}</p>}
          {notice && <p className="success-copy" role="status">{notice}</p>}
          <button className="primary" disabled={busy}>
            {busy ? (mode === "signin" ? "登录中…" : "注册中…") : (mode === "signin" ? "登录" : "创建账户")}
          </button>
        </form>
      </section>
    </main>
  );
}

function AuthenticatedApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>("today");
  const [plan, setPlan] = useState<TrainingPlanAggregate | null>(null);
  const [plans, setPlans] = useState<TrainingPlanAggregate[]>([]);
  const [playbook, setPlaybook] = useState<TrainingPlaybook | null>(null);
  const [history, setHistory] = useState<WorkoutRunSummary[]>([]);
  const [historyFocus,setHistoryFocus]=useState<string|null>(null);
  const [progression, setProgression] = useState<Array<Pick<WorkoutRunAggregate, "sourceSessionTemplateId" | "completedAt" | "revertedAt">>>([]);
  const [activeRun, setActiveRun] = useState<WorkoutRunAggregate | null>(null);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const load = async (silent = false) => {
    if (!silent) setState("loading");
    setError("");
    try {
      const progressionRequest = repos().history.listProgressionRuns();
      const [p, h, r] = await Promise.all([
        repos().plans.getActivePlan(progressionRequest),
        progressionRequest,
        repos().workouts.getActiveRun(),
      ]);
      setPlan(p);
      setProgression(h);
      setActiveRun(r);
      setState("ready");
      // The Today critical path does not need inactive Plan graphs.
      const secondary = await Promise.all([repos().plans.listPlans(true), repos().plans.getActivePlaybook(), repos().history.listRuns({ limit: 30 })]);
      const allPlans = secondary[0];
      setPlaybook(secondary[1]);
      setHistory(secondary[2]);
      setPlans(allPlans);
    } catch (x) {
      setError(messageOf(x));
      setState("error");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const next = useMemo(
    () => (plan ? resolveNextSession(plan.sessions, progression) : null),
    [plan, progression],
  );
  async function start() {
    setError("");
    try {
      const run =
        activeRun ?? (next ? await repos().workouts.prepareRun(next.id) : null);
      if (!run) return;
      if (run.status === "prepared") await repos().workouts.startRun(run.id);
      setActiveRun(await repos().workouts.getActiveRun());
      setWorkoutOpen(true);
    } catch (x) {
      setError(messageOf(x));
    }
  }
  if (activeRun && workoutOpen)
    return (
      <HardenedWorkoutScreen
        run={activeRun}
        onExit={async () => {
          setWorkoutOpen(false);
          await load(true);
        }}
      />
    );
  return (
    <div className="v1">
      <header className="v1-head">
        <button className="v1-brand" onClick={() => setTab("today")}>
          ⚡{" "}
          <span>
            FORM<small>TRAIN WITH INTENT</small>
          </span>
        </button>
        <nav>
          {tabs.map((x) => (
            <button
              className={tab === x.id ? "on" : ""}
              onClick={() => setTab(x.id)}
              key={x.id}
            >
              {x.label}
            </button>
          ))}
        </nav>
        <button
          className="primary"
          disabled={state === "loading"}
          onClick={() => activeRun || next ? start() : setTab("plan")}
        >
          {state === "loading"
            ? "同步中…"
            : activeRun
              ? "继续训练"
              : next
                ? "开始训练"
                : "先创建计划"}
        </button>
      </header>
      <main className="v1-main">
        {error && <InlineError text={error} retry={load} />}{" "}
        {state === "loading" ? (
          <CloudLoading />
        ) : (
          <>
            {tab === "today" && (
              <Today
                plan={plan}
                next={next}
                activeRun={activeRun}
                state={state}
                start={start}
                go={setTab}
                onRunChanged={setActiveRun}
              />
            )}{" "}
            {tab === "plan" && <PlanPage plan={plans.find(item => item.id === plan?.id) ?? plan} plans={plans.filter(item => item.status !== "deleted")} playbook={playbook} activeRun={activeRun} onCreated={load} />}{" "}
            {tab === "exercises" && <ExercisesPage onSession={id=>{setHistoryFocus(id);setTab('history');}} />}{" "}
            {tab === "history" && <HistoryPage runs={history} plans={plans} onChanged={load} initialRunId={historyFocus} />}{" "}
            {tab === "profile" && (
              <ProfilePage email={session.user.email ?? ""} plan={plans.find(item=>item.id===plan?.id)??plan} onSession={id=>{setHistoryFocus(id);setTab("history");}} />
            )}
          </>
        )}
      </main>
      <div className="mobile-nav">
        {tabs.map((x) => (
          <button
            className={tab === x.id ? "on" : ""}
            onClick={() => setTab(x.id)}
            key={x.id}
          >
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Today({
  plan,
  next,
  activeRun,
  state,
  start,
  go,
  onRunChanged,
}: {
  plan: TrainingPlanAggregate | null;
  next: TrainingPlanAggregate["sessions"][number] | null;
  activeRun: WorkoutRunAggregate | null;
  state: LoadState;
  start: () => void;
  go: (tab: Tab) => void;
  onRunChanged: (run: WorkoutRunAggregate) => void;
}) {
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [warmupPickerId, setWarmupPickerId] = useState<string | null>(null);
  const [adding,setAdding]=useState(false),[removing,setRemoving]=useState<string|null>(null),[actionError,setActionError]=useState(''),[warmupBusy,setWarmupBusy]=useState(false);
  const preparing=useRef<Promise<WorkoutRunAggregate>|null>(null);
  useEffect(()=>{preparing.current=null;},[activeRun?.id,next?.id]);
  async function ensureRun(){if(activeRun)return activeRun;if(!next)throw new Error('没有当前训练。');if(!preparing.current)preparing.current=repos().workouts.prepareRun(next.id).then(run=>{onRunChanged(run);return run;}).catch(error=>{preparing.current=null;throw error;});return preparing.current;}
  const warmupBlock = activeRun?.sessionSnapshot.warmupBlock??(next ? resolveSessionWarmup(next) : null);
  const warmupStorageKey = activeRun ? occurrenceWarmupKey(activeRun.userId,activeRun.id) : "";
  const [warmupState,setWarmupState]=useState<{key:string;progress:WarmupProgress}>({key:'',progress:emptyWarmupProgress()});
  const warmupProgress=warmupState.key===warmupStorageKey?warmupState.progress:emptyWarmupProgress();
  useEffect(()=>{
    setWarmupState({key:warmupStorageKey,progress:readWarmupProgress(localStorage,warmupStorageKey)});
  },[warmupStorageKey]);
  async function updateWarmup(nextProgress:typeof warmupProgress){setWarmupBusy(true);try{const run=await ensureRun();const key=occurrenceWarmupKey(run.userId,run.id);localStorage.setItem(key,JSON.stringify(nextProgress));setWarmupState({key,progress:nextProgress});}catch(cause){setActionError(cause instanceof Error?cause.message:String(cause));}finally{setWarmupBusy(false);}}
  const warmupCompleted = warmupBlock?.exercises.filter(item=>warmupProgress.completedIds.includes(item.id)).length ?? 0;
  const currentExercise = activeRun ? nextPendingExercise(activeRun) : null;
  const exerciseRows = activeRun
    ? [...activeRun.exercises]
        .sort((a, b) => a.order - b.order)
        .map((exercise) => ({
          id: exercise.id,
          ...getWorkoutExerciseDisplay(exercise),
          state:
            exercise.status === "completed"
              ? "completed"
              : exercise.status === "skipped"
                ? "skipped"
                : exercise.id === currentExercise?.id
                  ? "current"
                  : "upcoming",
          adjusted: exercise.selectedVariationId !== exercise.defaultVariationId,
          tutorial: getVariationMetadata(exercise.selectedVariationId),
        }))
    : [...(next?.intents ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((intent) => ({
          id: intent.id,
          ...getVariationDisplay(intent.defaultVariationId),
          state: "planned",
          adjusted: false,
          tutorial: getVariationMetadata(intent.defaultVariationId),
        }));
  const total = exerciseRows.length;
  const completed = activeRun
    ? activeRun.exercises.filter((exercise) => exercise.status === "completed" || exercise.status === "skipped").length
    : 0;
  const sessionName = activeRun?.sessionSnapshot.name ?? next?.name;
  const sessionPurpose = activeRun?.sessionSnapshot.purpose ?? next?.purpose;
  const pickerExercise = activeRun?.exercises.find(item => item.id === pickerId);
  const pickerIntent = pickerExercise?.intentSnapshot ?? next?.intents.find(item => item.id === pickerId);
  const warmupPicker = warmupBlock?.exercises.find(item => item.id === warmupPickerId);
  async function selectToday(id: string,adjustment?:MeasurementAdjustment,scope:WorkoutChangeScope='workout') {
    const run = await ensureRun();
    if (!run) throw new Error("没有当前训练。");
    const exercise = pickerExercise ?? run.exercises.find(item => item.sourceIntentId === pickerId);
    if (!exercise) throw new Error("找不到当前动作。");
    await repos().workouts.selectExercise(exercise.id, id, "preference",undefined,{scope,adjustment});
    const updated = await repos().workouts.getActiveRun();
    if (updated) onRunChanged(updated);
  }
  async function reorderToday(ids:string[]){
    const run=await ensureRun();
    if(!run)throw new Error('没有当前训练。');
    const mapped=activeRun?ids:ids.map(id=>run.exercises.find(e=>e.sourceIntentId===id)?.id??'');
    onRunChanged(await repos().workouts.reorderExercises(run.id,mapped,run.version));
  }
  return (
    <div className="today-page">
      {actionError&&<p role="alert" className="error-copy">{actionError}</p>}
      <header className="today-heading"><p className="kicker">TODAY</p><h1>{sessionName ?? "今天暂无训练"}</h1><p>{sessionPurpose ?? "前往 Plan 选择你的训练计划。"}</p></header>
      <section className="workout-stage">
        <div className="stage-copy">
          <div className="status-line">
            <span className="status-dot" />
            {state === "loading"
              ? "正在同步"
              : activeRun
                ? "训练进行中"
                : plan?.name === RECOVERY_PLAN_NAME ? sessionName?.split("·").at(-1)?.trim() ?? "RECOVERY" : "NEXT SESSION"}
          </div>
          <h2>{activeRun ? `${completed} / ${total}` : total}</h2>
          <p className="stage-purpose">{activeRun ? "个正式动作已完成" : `个正式动作 · ${warmupBlock?.exercises.length ?? 0} 个热身动作`}</p>
          {sessionName ? (
            <button className="start-workout" onClick={start}>
              <span>{activeRun ? "继续训练" : "开始训练"}</span>
              <b>↗</b>
            </button>
          ) : <button className="start-workout" onClick={() => go("plan")}><span>创建训练计划</span><b>↗</b></button>}
        </div>
        {sessionName && (
          <div className="session-brief">
            <div className="exercise-preview">
              <small>{activeRun ? "TODAY · 训练进度" : "TODAY · 完整流程"}</small>
              {warmupBlock && <div className="warmup-preview-group">
                <div className="preview-group-title"><b>热身准备</b><span>{warmupCompleted}/{warmupBlock.exercises.length}</span></div>
                {warmupBlock.exercises.map((item,i)=>{
                  const selectedId=warmupProgress.selectedVariationIds[item.id]??item.defaultVariationId;
                  const action={...(warmupActions[selectedId]??getVariationMetadata(selectedId)??warmupActions[item.defaultVariationId]??{nameZh:"热身动作",nameEn:"Warm-up Exercise"}),tutorialUrl:getVariationMetadata(selectedId)?.tutorialUrl};
                  const done=warmupProgress.completedIds.includes(item.id);
                  return <div className={`warmup-preview-row ${done?"completed":""}`} key={item.id}>
                    <button className="warmup-check" disabled={warmupBusy} aria-label={`${done?"取消完成":"完成"} ${action.nameZh}`} aria-pressed={done} onClick={()=>void updateWarmup({...warmupProgress,completedIds:done?warmupProgress.completedIds.filter(id=>id!==item.id):[...warmupProgress.completedIds,item.id]})}>{done?"✓":""}</button>
                    <span className="warmup-preview-copy"><small>{String(i+1).padStart(2,"0")} · {warmupIntentLabels[item.warmupIntent]}</small><b>{action.nameZh}</b><em>{action.nameEn}</em></span>
                    <span className="warmup-preview-actions">{action.tutorialUrl&&<a href={action.tutorialUrl} target="_blank" rel="noreferrer">教程 ↗</a>}<button onClick={() => setWarmupPickerId(item.id)}>替换动作</button></span>
                  </div>;
                })}
                <p className="warmup-round-note">建议完成 {warmupBlock.defaultRounds} 轮 · 保持质量，不做到疲劳</p>
              </div>}
              <div className="preview-group-title main"><b>正式训练</b><span>{exerciseRows.length} 个动作</span></div>
              <p className="session-action-guidance">建议 4–6 个正式动作{exerciseRows.length>7?' · 动作较多，请留意训练时长与恢复。':''}</p>
              <ExerciseOrder ids={exerciseRows.map(e=>e.id)} onOrder={reorderToday} renderItem={(id,i,handle)=>{const exercise=exerciseRows.find(e=>e.id===id)!;return (
                <div
                  className={`exercise-preview-row ${exercise.state}`}
                  aria-current={exercise.state === "current" ? "step" : undefined}
                  key={exercise.id}
                >
                  <span>{handle}</span>
                  <span className="exercise-preview-copy">
                    <b>{exercise.nameZh}</b>
                    {exercise.nameEn && <small>{exercise.nameEn}</small>}
                  </span>
                  <strong className="exercise-preview-state">
                    {exercise.state === "completed"
                      ? "✓ 已完成"
                      : exercise.state === "skipped"
                        ? "— 已跳过"
                        : exercise.state === "current"
                          ? "当前"
                          : exercise.state === "upcoming"
                            ? "待训练"
                            : "计划"}
                  </strong>
                  <span className="exercise-preview-actions">
                    {exercise.tutorial?.tutorialUrl && <a className="exercise-tutorial-link" href={exercise.tutorial.tutorialUrl} target="_blank" rel="noreferrer">动作教程 ↗</a>}
                    {exercise.state !== "completed" && exercise.state !== "skipped" && <button className="today-change-exercise" onClick={() => setPickerId(exercise.id)}>替换动作</button>}
                    {exerciseRows.length>1&&exercise.state!=='completed'&&exercise.state!=='skipped'&&!activeRun?.exercises.find(e=>e.id===exercise.id)?.sets.some(s=>s.completed)&&<button className="today-change-exercise" onClick={()=>setRemoving(exercise.id)}>删除动作</button>}
                  </span>
                </div>
              );}}/>
              <button className="plan-replace-trigger" disabled={exerciseRows.length>=10} onClick={async()=>{try{await ensureRun();setAdding(true);}catch(cause){setActionError(cause instanceof Error?cause.message:String(cause));}}}>＋ 增加动作</button>
            </div>
          </div>
        )}
      </section>
      {pickerIntent && <ExercisePicker allowPlanDefault={Boolean(plan&&(!pickerExercise||pickerExercise.sourceIntentId))} intent={pickerIntent} currentId={pickerExercise?.selectedVariationId ?? pickerIntent.defaultVariationId} selectedIds={activeRun?.exercises.filter(item => item.id !== pickerId).map(item => item.selectedVariationId) ?? next?.intents.filter(item => item.id !== pickerId).map(item => item.defaultVariationId)} choose={selectToday} close={() => setPickerId(null)}/>}
      {adding&&<AddWorkoutAction run={activeRun} close={()=>setAdding(false)} choose={async(id,scope)=>{const run=await ensureRun();onRunChanged(await repos().workouts.addExercise(run.id,id,scope));}}/>}
      {removing&&<RemoveWorkoutAction name={exerciseRows.find(e=>e.id===removing)?.nameZh??'动作'} canSync={Boolean(plan&&(!activeRun||activeRun.exercises.find(e=>e.id===removing)?.sourceIntentId))} close={()=>setRemoving(null)} remove={async scope=>{const run=await ensureRun();const e=run.exercises.find(e=>e.id===removing||e.sourceIntentId===removing);if(!e)throw new Error('动作已改变，请刷新。');onRunChanged(await repos().workouts.removeExercise(e.id,scope));}}/>}
      {warmupPicker && <ExercisePicker intent={{ preparationIntent: warmupPicker.warmupIntent, label: warmupIntentLabels[warmupPicker.warmupIntent], order: warmupPicker.order, defaultVariationId: warmupPicker.defaultVariationId, explicitOptionIds: warmupPicker.replacementVariationIds }} currentId={warmupProgress.selectedVariationIds[warmupPicker.id] ?? warmupPicker.defaultVariationId} selectedIds={warmupBlock?.exercises.filter(item => item.id !== warmupPicker.id).map(item => warmupProgress.selectedVariationIds[item.id] ?? item.defaultVariationId)} choose={async id => updateWarmup({ ...warmupProgress, selectedVariationIds: { ...warmupProgress.selectedVariationIds, [warmupPicker.id]: id } })} close={() => setWarmupPickerId(null)}/>}
    </div>
  );
}

export function PlanPage({
  plan,
  plans,
  playbook,
  activeRun,
  onCreated,
}: {
  plan: TrainingPlanAggregate | null;
  plans: TrainingPlanAggregate[];
  playbook: TrainingPlaybook | null;
  activeRun: WorkoutRunAggregate | null;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("我的训练计划");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [switchTarget, setSwitchTarget] = useState<TrainingPlanAggregate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingPlanAggregate | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [detailReplace, setDetailReplace] = useState<{session:number;intent:number}|null>(null);
  const [importOpen, setImportOpen] = useState(false);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await repos().plans.saveProgram(examplePlaybookV01, { ...createExampleTrainingPlan(), name: name.trim() });
      await onCreated();
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  }
  if (importOpen) return <PlanImportView activeRun={activeRun} overwriteTarget={plans.find(item=>item.id===detailId)??plan} close={() => setImportOpen(false)} applied={async () => { await onCreated(); setImportOpen(false); }} />;
  if (!plan && plans.length === 0)
    return (
      <>
        <PageTitle kicker="PLAN" title="保存第一份训练计划" />
        <button className="plan-import-entry" onClick={() => setImportOpen(true)}>导入方案 <span>↗</span></button>
        <section className="empty-cloud">
          <h2>Cloud Plan 尚为空</h2>
          <p>
            可导入自己的方案，或选择保存下方通用示例。示例不会自动写入；保存后仍可编辑或替换。
          </p>
          <form onSubmit={create}>
            <input
              aria-label="计划名称"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              {busy ? "保存中…" : "保存可选示例计划"}
            </button>
          </form>
          {error && <p className="error-copy">{error}</p>}
        </section>
      </>
    );
  return (
    <>
      <PageTitle kicker="PLAN" title="训练计划" />
      <button className="plan-import-entry" onClick={() => setImportOpen(true)}>导入方案 <span>↗</span></button>
      {!plan && <p className="plan-no-current">目前没有 Current Plan。选择一份已有计划，或导入新方案。</p>}
      <div className="plan-card-grid">{plans.map(item => {
        const recovery=item.name===RECOVERY_PLAN_NAME;
        const tags=recovery?["髋周强化","负荷耐受","恢复训练"]:["力量","肌肉","运动能力"];
        return <button className={`plan-card ${item.id===plan?.id?"active":""}`} key={item.id} onClick={()=>{setDetailId(item.id);setEditing(false);}}><span>{item.id===plan?.id?"CURRENT":"VIEW PLAN"}</span><h2>{item.name}</h2>{item.cycleName&&<p>{item.cycleName}</p>}<div>{tags.map(tag=><b key={tag}>{tag}</b>)}</div><footer><strong>{recovery?"7 Days":`约 ${item.plannedWeeks??4} 周`}</strong><i>↗</i></footer></button>;
      })}</div>
      {detailId && (()=>{const detail=plans.find(item=>item.id===detailId);if(!detail)return null;const recovery=detail.name===RECOVERY_PLAN_NAME;const locked=Boolean(activeRun && detail.id===plan?.id);return <section className="plan-detail">
        <button className="plan-detail-close" onClick={()=>setDetailId(null)}>← 返回全部计划</button>
        <header><div><small>PLAN DETAIL</small><h2>{detail.name}</h2><p>{detail.cycleName}</p></div>{detail.id===plan?.id?<span>CURRENT</span>:<button className="primary" disabled={Boolean(activeRun)} onClick={()=>setSwitchTarget(detail)}>{activeRun?"完成当前训练后切换":"切换到此计划"}</button>}</header>
        <div className="plan-detail-actions"><button onClick={()=>{setDetailReplace(null);setEditing(value=>!value);}}>{editing?"返回详情":"编辑未来计划"}</button><button onClick={()=>setImportOpen(true)}>导入方案覆盖此计划</button><button disabled={locked} onClick={()=>setDeleteTarget(detail)}>删除计划</button>{locked&&<small>计划编辑仅影响未来训练；删除计划前请结束当前训练。</small>}</div>
        {editing ? <PlanEditor key={detail.id} plan={detail} busy={busy} initialReplace={detailReplace} cancel={()=>{setEditing(false);setDetailReplace(null);}} save={async draft=>{setBusy(true);try{await repos().plans.updatePlan(detail.id,draft);await onCreated();setEditing(false);setDetailReplace(null);}finally{setBusy(false);}}}/> : <>
        <div className="plan-detail-section"><small>OVERVIEW</small><p>{detail.rationale??detail.cycleFocus}</p></div>
        <div className="plan-detail-section"><small>FLOW</small><div className="plan-flow">{detail.sessions.map((session,index)=><span key={session.id}><i>{recovery?`D${index+1}`:String.fromCharCode(65+index)}</i><b>{session.purpose??session.name}</b></span>)}<span><i>↻</i><b>{recovery?"完成后评估":"Repeat"}</b></span></div>
          <div className="plan-session-details">{detail.sessions.map((session,sessionIndex)=><details key={session.id}><summary>{session.name}<small>{session.purpose}</small></summary>
            {session.designNotes?.rationale&&<p>{session.designNotes.rationale}</p>}
            {(() => { const warmup = resolveSessionWarmup(session); return <details className="plan-warmup"><summary>WARM-UP · {warmup.title}<small>{warmup.focus}</small></summary><ol>{warmup.exercises.map(item=><li key={item.id}><b>{warmupActions[item.defaultVariationId]?.nameZh??getVariationDisplay(item.defaultVariationId).nameZh}</b><span>{warmupActions[item.defaultVariationId]?.nameEn??getVariationDisplay(item.defaultVariationId).nameEn} · {item.reps??item.breaths??""}</span></li>)}</ol></details>; })()}
            <h4>MAIN WORKOUT</h4><ol>{session.intents.map((intent,intentIndex)=>{const display=getConcreteVariationDisplay(intent.defaultVariationId);return <li key={intent.id}><button className="plan-detail-exercise-action" onClick={()=>{setDetailReplace({session:sessionIndex,intent:intentIndex});setEditing(true);}}><b>{display.nameZh}</b><span>{display.nameEn}</span><small>{formatPlanPrescription(intent.prescription)}</small><em>替换动作 →</em></button></li>})}</ol>
          </details>)}</div>
        </div>
        <div className="plan-detail-section"><small>GOAL</small><h3>{detail.cycleFocus}</h3><p>{detail.goalSummary}</p></div>
        </>}
      </section>})()}
      {playbook && <details className="philosophy-disclosure"><summary>Training Philosophy &amp; Rules <span>↓</span></summary><section className="playbook-panel"><div className="playbook-lead"><div><small>TRAINING PLAYBOOK · {playbook.version}</small><h2>{playbook.name}</h2></div><p>{playbook.positioning}</p></div><div className="playbook-structure"><details><summary>Training Philosophy</summary><ol>{playbook.corePrinciples.map((item,index)=><li key={item}><i>{String(index+1).padStart(2,"0")}</i><span>{item}</span></li>)}</ol></details><details><summary>Organization Rules</summary><ul>{playbook.organizationRules.map(item=><li key={item}>{item}</li>)}</ul></details><details><summary>Frequency Rules</summary><div className="frequency-rules">{playbook.frequencyRules.map(item=><p key={item.frequency}><b>{item.frequency}×</b><span>{item.approach}</span></p>)}</div></details><details><summary>Plan Change Rules</summary><ul>{playbook.planChangeRules.map(item=><li key={item}>{item}</li>)}</ul></details></div></section></details>}
      {switchTarget && <div className="finish-confirm" role="dialog" aria-modal="true" aria-labelledby="switch-plan-title"><section><small>SWITCH CURRENT PLAN</small><h2 id="switch-plan-title">切换到{switchTarget.cycleName ?? switchTarget.name}？</h2><p>当前计划及训练记录不会被删除。切换后 Today 将按目标计划自己的历史继续原有进度。</p><div><button onClick={() => setSwitchTarget(null)}>取消</button><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await repos().plans.setActivePlan(switchTarget.id);setSwitchTarget(null);await onCreated();}catch(x){setError(messageOf(x));}finally{setBusy(false);}}}>{busy?"切换中…":"确认切换"}</button></div>{error&&<p className="error-copy">{error}</p>}</section></div>}
      {deleteTarget && <div className="finish-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title"><section><small>DELETE PLAN</small><h2 id="delete-plan-title">删除「{deleteTarget.name}」？</h2><p>计划将从列表隐藏，训练历史不会被删除。若删除 Current Plan，Today 将等待你手动选择下一份计划。</p><div><button onClick={()=>setDeleteTarget(null)}>取消</button><button className="void-action" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await repos().plans.deletePlan(deleteTarget.id);setDeleteTarget(null);setDetailId(null);await onCreated();}catch(x){setError(messageOf(x));}finally{setBusy(false);}}}>{busy?"删除中…":"确认删除"}</button></div>{error&&<p className="error-copy">{error}</p>}</section></div>}
    </>
  );
}

export function PlanImportView({ activeRun, overwriteTarget, close, applied }: { activeRun: WorkoutRunAggregate | null; overwriteTarget?: TrainingPlanAggregate | null; close: () => void; applied: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<PlanImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const validate = () => {
    setError("");
    setResult(parseAndValidatePlanImport(text));
  };
  const apply = async (kind: "overwrite" | "create") => {
    if (activeRun || !result?.ok || (kind === "overwrite" && !overwriteTarget)) return;
    setBusy(true);
    setError("");
    try {
      await applyValidatedPlanImport(result, repos().plans, kind === "overwrite" ? { kind, planId: overwriteTarget!.id } : { kind }, activeRun);
      await applied();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  };
  return <section className="plan-import">
    <button className="plan-detail-close" onClick={close}>← 返回训练计划</button>
    <header><small>IMPORT PLAN</small><h1>{result?.ok ? "确认方案" : "导入方案"}</h1><p>{result?.ok ? "检查训练结构与处方，再选择覆盖已有计划或另存为新计划。" : "粘贴完整的 FORM Plan Package。FORM 会先校验动作与处方，不会自动保存。"}</p></header>
    {!result?.ok && <div className="plan-import-paste">
      <label htmlFor="plan-package">粘贴方案</label>
      <textarea id="plan-package" value={text} onChange={event => { setText(event.target.value); setResult(null); }} placeholder={'粘贴以 {\n  "version": "form.plan-import.v1"\n} 开头的完整方案'} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      {result && !result.ok && <ImportIssues issues={result.issues} />}
      <button className="primary" disabled={!text.trim()} onClick={validate}>解析并校验</button>
    </div>}
    {result?.ok && <div className="plan-import-preview">
      <div className="plan-import-summary"><small>PLAN PREVIEW</small><h2>{result.package.plan.name}</h2><p>{result.package.plan.goalSummary ?? result.package.plan.cycleFocus}</p><strong>{result.package.plan.sessions.length} Sessions</strong></div>
      <div className="plan-import-sessions">{[...result.package.plan.sessions].sort((a,b)=>a.order-b.order).map((session, sessionIndex) => <article key={`${session.order}-${session.title}`}><header><i>{String.fromCharCode(65 + sessionIndex)}</i><div><h3>{session.title}</h3>{session.purpose && <p>{session.purpose}</p>}</div></header><ol>{[...session.exercises].sort((a,b)=>a.order-b.order).map((item, exerciseIndex) => {
        const originalSessionIndex = result.package.plan.sessions.indexOf(session);
        const originalExerciseIndex = session.exercises.indexOf(item);
        const resolved = result.resolved[originalSessionIndex][originalExerciseIndex];
        const display = getVariationDisplay(resolved.variation.id);
        return <li key={`${item.order}-${item.exercise}`}><span>{exerciseIndex + 1}</span><div><b>{display.nameZh}</b><small>{display.nameEn}</small><em>{formatImportedPrescription(item)}</em></div></li>;
      })}</ol></article>)}</div>
      {activeRun && <p className="plan-import-warning">请先完成或重置当前训练，再应用新的 Current Plan。</p>}
      {error && <p className="error-copy">{error}</p>}
      <div className="plan-import-actions"><button disabled={busy} onClick={() => setResult(null)}>返回修改</button>{overwriteTarget&&<button className="primary" disabled={busy || Boolean(activeRun)} onClick={()=>setConfirmOverwrite(true)}>{overwriteTarget.status === "active" ? "覆盖当前计划" : "覆盖此计划"}</button>}<button disabled={busy || Boolean(activeRun)} onClick={()=>void apply("create")}>另存为新计划</button></div>
    </div>}
    {confirmOverwrite && overwriteTarget && <div className="finish-confirm" role="dialog" aria-modal="true" aria-labelledby="import-overwrite-title"><section><small>OVERWRITE PLAN</small><h2 id="import-overwrite-title">覆盖「{overwriteTarget.name}」？</h2><p>将用这份方案覆盖「{overwriteTarget.name}」。历史训练记录不会删除，Plan ID 保持不变。</p><div><button disabled={busy} onClick={()=>setConfirmOverwrite(false)}>取消</button><button className="primary" disabled={busy || Boolean(activeRun)} onClick={()=>void apply("overwrite")}>{busy?"保存中…":"确认覆盖"}</button></div>{error&&<p className="error-copy">{error}</p>}</section></div>}
  </section>;
}

function ImportIssues({ issues }: { issues: PlanImportIssue[] }) {
  return <div className="plan-import-errors" role="alert"><strong>方案暂时无法导入</strong><ul>{issues.slice(0, 12).map((issue, index) => <li key={`${issue.code}-${index}`}><span>{issue.sessionIndex === undefined ? "方案" : `Session ${issue.sessionIndex + 1}${issue.exerciseIndex === undefined ? "" : ` · 动作 ${issue.exerciseIndex + 1}`}`}</span>{issue.message}</li>)}</ul>{issues.length > 12 && <p>另有 {issues.length - 12} 个问题，请先修正以上结构后重新校验。</p>}</div>;
}

function WorkoutScreen({
  run: onLoad,
  onExit,
}: {
  run: WorkoutRunAggregate;
  onExit: () => Promise<void>;
}) {
  const [run, setRun] = useState(onLoad);
  const [save, setSave] = useState<"Saved" | "Saving" | "Retry">("Saved");
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState<WorkoutExercise | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const runRef = useRef(run);
  const timers = useRef(new Map<string, number>());
  const writes = useRef(new Map<string, Promise<void>>());
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  const reload = async () => {
    const value = await repos().workouts.getActiveRun();
    if (value) setRun(value);
  };
  useEffect(() => {
    const pending = readPendingWorkoutWrites().filter(
      (item) => item.workoutRunId === run.id,
    );
    if (!pending.length) return;
    setSave("Saving");
    void Promise.all(
      pending.map((item) =>
        repos()
          .workouts.updateSet(item.setId, item.patch)
          .then(() => removeWorkoutWrite(item.setId)),
      ),
    )
      .then(reload)
      .then(() => setSave("Saved"))
      .catch(() => setSave("Retry"));
  }, []);
  function localPatch(
    setId: string,
    values: Omit<WorkoutSetPatch, "version">,
    immediate = false,
  ) {
    setRun((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.id === setId ? { ...set, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === null ? undefined : value])) } : set,
        ),
      })),
    }));
    const existing = timers.current.get(setId);
    if (existing) window.clearTimeout(existing);
    setSave("Saving");
    timers.current.set(
      setId,
      window.setTimeout(() => void persist(setId), immediate ? 0 : 420),
    );
  }
  async function persist(setId: string) {
    timers.current.delete(setId);
    const set = findSet(runRef.current, setId);
    if (!set) return;
    const patch: WorkoutSetPatch = {
      actualLoad: set.actualLoad,
      actualReps: set.actualReps,
      actualRPE: set.actualRPE,
      actualRIR: set.actualRIR,
      completed: set.completed,
      note: set.note,
      version: set.version,
    };
    journalWorkoutWrite({
      workoutRunId: run.id,
      setId,
      patch,
      timestamp: new Date().toISOString(),
    });
    const previous = writes.current.get(setId) ?? Promise.resolve();
    const next = previous
      .then(async () => {
        const fresh = findSet(runRef.current, setId);
        if (!fresh) return;
        const saved = await repos().workouts.updateSet(setId, {
          ...patch,
          version: fresh.version,
        });
        setRun((current) => ({
          ...current,
          exercises: current.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((item) =>
              item.id === setId ? saved : item,
            ),
          })),
        }));
        removeWorkoutWrite(setId);
      })
      .catch((x) => {
        setError(messageOf(x));
        setSave("Retry");
        throw x;
      });
    writes.current.set(setId, next);
    try {
      await next;
      writes.current.delete(setId);
      if (!writes.current.size && !timers.current.size) setSave("Saved");
    } catch {
      /* state already reports retry */
    }
  }
  async function flush() {
    for (const [id, timer] of timers.current) {
      window.clearTimeout(timer);
      timers.current.delete(id);
      await persist(id);
    }
    await Promise.all([...writes.current.values()]);
  }
  const current = nextPendingExercise(run);
  const completed = run.exercises.filter(
    (x) => x.status === "completed",
  ).length;
  async function add(exercise: WorkoutExercise) {
    setSave("Saving");
    try {
      await flush();
      const set = await repos().workouts.addSet(exercise.id);
      setRun((value) => ({
        ...value,
        exercises: value.exercises.map((x) =>
          x.id === exercise.id ? { ...x, sets: [...x.sets, set] } : x,
        ),
      }));
      setSave("Saved");
    } catch (x) {
      setError(messageOf(x));
      setSave("Retry");
    }
  }
  async function remove(setId: string) {
    setSave("Saving");
    try {
      await repos().workouts.deleteSet(setId);
      setRun((value) => ({
        ...value,
        exercises: value.exercises.map((x) => ({
          ...x,
          sets: x.sets.filter((s) => s.id !== setId),
        })),
      }));
      setDeleteId(null);
      setSave("Saved");
    } catch (x) {
      setError(messageOf(x));
      setSave("Retry");
    }
  }
  async function complete(exercise: WorkoutExercise) {
    try {
      await flush();
      await repos().workouts.completeExercise(exercise.id);
      await reload();
    } catch (x) {
      setError(messageOf(x));
    }
  }
  async function finish() {
    try {
      await flush();
      const latest = await repos().workouts.getActiveRun();
      if (!latest || !canFinishWorkout(latest)) {
        setError("请先完成或跳过每个动作。");
        return;
      }
      await repos().workouts.completeRun(run.id, latest.version);
      await onExit();
    } catch (x) {
      setError(messageOf(x));
      setSave("Retry");
    }
  }
  return (
    <div className="workout execution">
      <header>
        <button onClick={() => void onExit()}>← 暂停</button>
        <div>
          <small>{save}</small>
          <h2>{run.sessionSnapshot.name}</h2>
        </div>
        <button
          className="primary"
          disabled={!canFinishWorkout(run) || save === "Saving"}
          onClick={finish}
        >
          完成训练
        </button>
      </header>
      <main>
        <div className="workout-progress">
          <span>
            {completed} / {run.exercises.length} exercises
          </span>
          <i>
            <b
              style={{
                width: `${run.exercises.length ? (completed / run.exercises.length) * 100 : 0}%`,
              }}
            />
          </i>
        </div>
        {run.exercises
          .filter((x) => x.status === "completed")
          .map((x) => (
            <details className="completed-exercise" key={x.id}>
              <summary>✓ {getWorkoutExerciseDisplay(x).nameZh}</summary>
              <p>{x.sets.filter((s) => s.completed).length} 组完成</p>
            </details>
          ))}
        {current && (
          <ExerciseExecution
            exercise={current}
            onPatch={localPatch}
            onAdd={() => add(current)}
            deleteId={deleteId}
            setDeleteId={setDeleteId}
            onDelete={remove}
            onComplete={() => complete(current)}
            onReplace={() => setReplacing(current)}
          />
        )}
        <section className="up-next">
          <small>UP NEXT</small>
          {run.exercises
            .filter((x) => x.status === "pending" && x.id !== current?.id)
            .map((x) => (
              <p key={x.id}><span>{getWorkoutExerciseDisplay(x).nameEn}</span><b>{getWorkoutExerciseDisplay(x).nameZh}</b></p>
            ))}
        </section>
        {error && (
          <InlineError
            text={error}
            retry={async () => {
              setError("");
              await reload();
              setSave("Saved");
            }}
          />
        )}
      </main>
      {replacing && (
        <ReplaceSheet
          exercise={replacing}
          close={() => setReplacing(null)}
          done={async () => {
            setReplacing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function ExerciseExecution({
  exercise,
  onPatch,
  onAdd,
  deleteId,
  setDeleteId,
  onDelete,
  onComplete,
  onReplace,
}: {
  exercise: WorkoutExercise;
  onPatch: (
    id: string,
    p: Omit<WorkoutSetPatch, "version">,
    immediate?: boolean,
  ) => void;
  onAdd: () => void;
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onComplete: () => void;
  onReplace: () => void;
}) {
  const [last, setLast] = useState<string[]>([]);
  useEffect(() => {
    void repos()
      .workouts.getLastPerformance(exercise.selectedVariationId)
      .then((value) =>
        setLast(
          value?.sets.map(
            (set) => `${set.actualLoad ?? "—"}kg × ${set.actualReps ?? "—"}`,
          ) ?? [],
        ),
      );
  }, [exercise.selectedVariationId]);
  return (
    <section className="current-exercise">
      <header>
        <div>
          <small>CURRENT EXERCISE</small>
          <h1>{getWorkoutExerciseDisplay(exercise).nameZh}</h1>
          <p>{getWorkoutExerciseDisplay(exercise).nameEn}</p>
        </div>
        <button onClick={onReplace}>替换动作</button>
      </header>
      {last.length > 0 && (
        <aside>
          <small>LAST TIME</small>
          {last.map((text, i) => (
            <span key={i}>{text}</span>
          ))}
        </aside>
      )}
      <div className="execution-sets">
        {exercise.sets.map((set, index) => (
          <div className={set.completed ? "complete" : ""} key={set.id}>
            <button
              className="set-check"
              onClick={() =>
                onPatch(
                  set.id,
                  {
                    completed: !set.completed,
                    actualLoad: set.actualLoad ?? set.targetLoad,
                    actualReps: set.actualReps ?? set.targetReps,
                  },
                  true,
                )
              }
            >
              {set.completed ? "✓" : index + 1}
            </button>
            <label>
              <span>KG</span>
              <input
                aria-label={`第 ${index + 1} 组重量`}
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                value={set.actualLoad ?? ""}
                placeholder={String(set.targetLoad ?? 0)}
                onChange={(e) =>
                  onPatch(set.id, {
                    actualLoad: numberOrUndefined(e.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>REPS</span>
              <input
                aria-label={`第 ${index + 1} 组次数`}
                inputMode="numeric"
                type="number"
                min="0"
                step="1"
                value={set.actualReps ?? ""}
                placeholder={String(set.targetReps ?? 8)}
                onChange={(e) =>
                  onPatch(set.id, {
                    actualReps: numberOrUndefined(e.target.value),
                  })
                }
              />
            </label>
            <small>
              目标 {set.targetReps ?? "—"} · RPE {set.targetRPE ?? "—"}
            </small>
            {deleteId === set.id ? (
              <span className="confirm-delete">
                删除？ <button onClick={() => onDelete(set.id)}>确认</button>
                <button onClick={() => setDeleteId(null)}>取消</button>
              </span>
            ) : (
              <button
                className="delete-set"
                aria-label={`删除第 ${index + 1} 组`}
                onClick={() => setDeleteId(set.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="add-set" onClick={onAdd}>
        ＋ 添加一组
      </button>
      <button className="complete-exercise" onClick={onComplete}>
        完成动作 →
      </button>
    </section>
  );
}

function ReplaceSheet({
  exercise,
  close,
  done,
}: {
  exercise: WorkoutExercise;
  close: () => void;
  done: () => Promise<void>;
}) {
  const [reason, setReason] = useState<ReplacementReason>(
    "equipmentUnavailable",
  );
  const [busy, setBusy] = useState(false);
  const candidates = rankSubstitutions(
    exercise.intentSnapshot,
    exercise.selectedVariationId,
  );
  async function choose(id: string) {
    setBusy(true);
    try {
      await repos().workouts.selectExercise(exercise.id, id, reason);
      await done();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="replace-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section>
        <header>
          <div>
            <small>INTENT 保持不变</small>
            <h2>替换 {getWorkoutExerciseDisplay(exercise).nameZh}</h2>
          </div>
          <button onClick={close}>×</button>
        </header>
        <label>
          替换原因
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReplacementReason)}
          >
            <option value="equipmentUnavailable">器械不可用</option>
            <option value="painOrDiscomfort">疼痛或不适</option>
            <option value="difficultyAdjustment">难度调整</option>
            <option value="preference">个人偏好</option>
            <option value="other">其他</option>
          </select>
        </label>
        <div>
          {candidates.length ? (
            candidates.map((item) => (
              <button
                disabled={busy}
                key={item.variation.id}
                onClick={() => choose(item.variation.id)}
              >
                <span>
                  {item.variation.nameZh || item.exercise.nameZh}
                  <small>{item.variation.nameEn || item.exercise.nameEn}</small>
                </span>
                <b>选择 →</b>
              </button>
            ))
          ) : (
            <p>目前没有足够匹配的替代动作。保留原动作更安全。</p>
          )}
        </div>
      </section>
    </div>
  );
}

function HistoryPage({ runs, plans, onChanged, initialRunId }: { runs: WorkoutRunSummary[]; plans: TrainingPlanAggregate[]; onChanged: () => Promise<void>;initialRunId?:string|null }) {
  const [selected, setSelected] = useState<WorkoutRunAggregate | null>(null);
  const [reverting, setReverting] = useState<WorkoutRunSummary | null>(null);
  const [reason, setReason] = useState<"accidentalCompletion" | "other">("accidentalCompletion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [performanceId,setPerformanceId]=useState<string|null>(null);
  useEffect(()=>{if(initialRunId)void open(initialRunId).catch(cause=>setError(messageOf(cause)));},[initialRunId]);
  async function open(id: string) {
    setSelected(await repos().history.getRun(id));
  }
  async function revert() {
    if (!reverting) return;
    setBusy(true); setError("");
    try {
      await repos().workouts.revertLastCompletedRun(reverting.id, reason, reverting.version);
      setReverting(null); setSelected(null); await onChanged();
    } catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  if(performanceId)return <Suspense fallback={<p role="status">正在打开表现页…</p>}><PerformanceProfile variationId={performanceId} onBack={()=>setPerformanceId(null)} onSession={id=>{setPerformanceId(null);void open(id).catch(cause=>setError(messageOf(cause)));}}/></Suspense>;
  return (
    <>
      <PageTitle kicker="HISTORY" title="真实训练记录" />
      {error&&!reverting&&<p role="alert" className="error-copy">{error}</p>}
      {!runs.length ? (
        <section className="empty-cloud">
          <h2>还没有完成记录</h2>
          <p>完成第一场 Workout 后，不可变 snapshot 会出现在这里。</p>
        </section>
      ) : (
        <div className="history-list">
          {runs.map((run, index) => <div className={`history-row ${run.revertedAt ? "reverted" : ""}`} key={run.id}>
            <button className="history-open" onClick={() => open(run.id)}><time>{formatDate(run.completedAt)}</time><strong>{run.sessionSnapshot.name}<small>{plans.find(plan=>plan.id===run.sourcePlanId)?.cycleName ?? plans.find(plan=>plan.id===run.sourcePlanId)?.name ?? "历史计划"}</small></strong><span>{run.exerciseCount} exercises · {duration(run)}</span>{run.revertedAt ? <em>已撤销</em> : <b>↗</b>}</button>
            {index === 0 && !run.revertedAt && <button className="undo-workout" onClick={() => setReverting(run)}>撤销最近一次训练</button>}
          </div>)}
        </div>
      )}
      {selected && (
        <div className="history-detail">
          <button onClick={() => setSelected(null)}>← 返回历史</button>
          <p className="kicker">COMPLETED SNAPSHOT</p>
          <h1>{selected.sessionSnapshot.name}</h1>
          {selected.revertedAt && <strong className="reverted-badge">已撤销 · 不计入训练推进与上次表现</strong>}
          <p>
            {formatDate(selected.completedAt)} · {duration(selected)}
          </p>
          {selected.exercises.map((exercise) => (
            <section key={exercise.id}>
              <h3>{getWorkoutExerciseDisplay(exercise).nameZh}</h3>
              <button className="performance-entry" onClick={()=>setPerformanceId(exercise.actualVariationId??exercise.selectedVariationId)}>Performance Profile ↗</button>
              {exercise.sets
                .filter((set) => set.completed)
                .map((set, i) => (
                  <span key={set.id}>
                    Set {i + 1} · {formatMeasuredPerformance(set, getVariationMetadata(exercise.actualVariationId ?? exercise.selectedVariationId)?.loadTrackingType ?? "externalLoad")}
                  </span>
                ))}
            </section>
          ))}
        </div>
      )}
      {reverting && <div className="finish-confirm undo-confirm" role="dialog" aria-modal="true" aria-labelledby="undo-title"><section><small>UNDO LAST WORKOUT</small><h2 id="undo-title">撤销最近一次训练？</h2><p>记录和 Snapshot 会保留在 History，但不再推进 Today，也不会计入 Previous Performance。</p><label>原因<select value={reason} onChange={event => setReason(event.target.value as typeof reason)}><option value="accidentalCompletion">误操作完成</option><option value="other">其他</option></select></label>{error && <p className="error-copy">{error}</p>}<div><button disabled={busy} onClick={() => setReverting(null)}>取消</button><button className="void-action" disabled={busy} onClick={revert}>{busy ? "撤销中…" : "确认撤销"}</button></div></section></div>}
    </>
  );
}

export function ExercisesPage({onSession}:{onSession:(id:string)=>void}) {
  const [q, setQ] = useState("");
  const [performanceId,setPerformanceId]=useState<string|null>(null);
  const normalizedQuery = q.trim().toLowerCase();
  const list = exerciseLibraryV1.exercises.filter((exercise) => {
    return !normalizedQuery || exerciseLibraryV1.variations.some(v=>v.exerciseId===exercise.id&&matchesAction(v.id,normalizedQuery));
  });
  const movementGroups = exerciseBrowseCategories.map(category => ({
    ...category,
    exercises: list.filter(exercise => exerciseBrowseCategory(exercise) === category.id),
  })).filter(group => group.exercises.length > 0);
  const bodyGroups = exerciseBodyCategories.map(category => ({
    ...category,
    exercises: list.filter(exercise => exerciseBodyCategoryIds(exercise).includes(category.id)),
  })).filter(group => group.exercises.length > 0);
  const reset = () => setQ("");
  const actionList=(exercises:typeof list)=><div className="library-variations">{exercises.flatMap(exercise=>exerciseLibraryV1.variations.filter(v=>v.exerciseId===exercise.id&&(!normalizedQuery||matchesAction(v.id,normalizedQuery))).map(v=>{const display=getConcreteVariationDisplay(v.id);return <article key={v.id}><div><h3>{display.nameZh}</h3><p>{display.nameEn}</p><small>{v.equipment.map(id=>equipmentVocabulary[id]).join(" / ")||"徒手"} · {exercise.primaryMovementPattern?patternLabels[exercise.primaryMovementPattern]:"辅助训练"} · {exercise.primaryCapacity}</small></div>{v.tutorialUrl?<a className="library-tutorial-link" href={v.tutorialUrl} target="_blank" rel="noreferrer">动作教程 ↗</a>:<span className="library-tutorial-pending">教程待补</span>}<button className="performance-entry" onClick={()=>setPerformanceId(v.id)}>训练表现 ↗</button></article>}))}</div>;
  const exerciseList=(exercises:typeof list)=><div className="exercise-family-list">{exerciseFamilyGroups(exercises).map(group=><details key={group.id}><summary><b>{group.label}</b><small>{group.exercises.reduce((count,e)=>count+exerciseLibraryV1.variations.filter(v=>v.exerciseId===e.id).length,0)} 个具体动作</small></summary>{actionList(group.exercises)}</details>)}</div>;
  if(performanceId)return <Suspense fallback={<p role="status">正在打开表现页…</p>}><PerformanceProfile variationId={performanceId} onBack={()=>setPerformanceId(null)} onSession={onSession}/></Suspense>;
  return (
    <div className="library-page">
      <div className="library-heading">
        <div><p className="kicker">EXERCISES</p><h1>动作库</h1></div>
        <strong><b>{list.reduce((count,e)=>count+exerciseLibraryV1.variations.filter(v=>v.exerciseId===e.id&&(!normalizedQuery||matchesAction(v.id,normalizedQuery))).length,0)}</b><span>/ {exerciseLibraryV1.variations.length} 个具体动作</span></strong>
      </div>
      <div className="library-filters">
        <label className="library-search"><span>搜索</span><input aria-label="搜索动作" value={q} onChange={(e) => setQ(e.target.value)} placeholder="中文、英文或别名" /></label>
        {q && <button className="filter-reset" onClick={reset}>清除搜索</button>}
      </div>
      {list.length ? normalizedQuery ? <div className="exercise-groups search-results"><h2>搜索结果</h2>{actionList(list)}</div> : <>
        <section className="library-discovery-heading"><small>PRIMARY NAVIGATION</small><h2>按动作模式找</h2></section>
        <div className="exercise-groups">{movementGroups.map((group,index) => <details key={group.id} open={index===0}><summary><span><small>{group.en}</small><b>{group.label}</b></span><em>{group.exercises.length}</em></summary>{exerciseList(group.exercises)}</details>)}</div>
        <details className="secondary-discovery"><summary><span><small>SECONDARY DISCOVERY</small><b>按身体 / 功能找</b></span><em>↓</em></summary><div className="exercise-groups body-groups">{bodyGroups.map(group=><details key={group.id}><summary><span><small>{group.en}</small><b>{group.label}</b></span><em>{group.exercises.length}</em></summary>{exerciseList(group.exercises)}</details>)}</div></details>
      </> : <div className="library-empty"><h2>没有匹配动作</h2><p>请尝试其他中英文名称。</p><button onClick={reset}>清除搜索</button></div>}
    </div>
  );
}

function ProfilePage({ email, plan, onSession }: { email: string; plan: TrainingPlanAggregate | null; onSession: (id: string) => void }) {
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState<TrainingReview | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"loading" | "loaded" | "insufficient" | "noHistory" | "error">("loading");
  const [reviewError, setReviewError] = useState("");
  const [reviewRetry, setReviewRetry] = useState(0);
  const [reviewDiagnostics, setReviewDiagnostics] = useState({ summaries: 0, hydrated: 0, excluded: 0 });
  useEffect(() => {
    if (!plan) { setReview(null); setReviewStatus("noHistory"); return; }
    setReview(null);
    setReviewStatus("loading");
    setReviewError("");
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadTrainingReviewEvidence(repos().history);
        if (cancelled) return;
        const { runs, summaryCount, excluded } = loaded;
        const missing = excluded.hydrationFailed + excluded.missingAggregate;
        setReviewDiagnostics({summaries:summaryCount,hydrated:runs.length,excluded:missing});
        if (import.meta.env.DEV)
          console.debug("FORM review evidence",{summaryRuns:summaryCount,validRuns:runs.length,excluded,scope:"all owned Plans / 4W + 4W baseline"});
        if (!summaryCount) { setReviewStatus("noHistory"); return; }
        if (!runs.length) { setReviewStatus("error"); setReviewError("近期训练记录读取失败，请重试。"); return; }
        const value = buildTrainingReview(plan,runs);
        setReview(value);
        setReviewStatus(value.performanceSessions<2 || value.comparableActions===0 ? "insufficient" : "loaded");
      } catch (cause) { if (!cancelled) { setReviewError(messageOf(cause)); setReviewStatus("error"); } }
    })();
    return () => { cancelled = true; };
  }, [plan,reviewRetry]);
  async function submitPassword(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (nextPassword !== confirmation) { setError("两次输入的新密码不一致。"); return; }
    if (currentPassword === nextPassword) { setError("新密码不能与当前密码相同。"); return; }
    setBusy(true);
    try {
      await authService.changePassword(email, currentPassword, nextPassword);
      setCurrentPassword(""); setNextPassword(""); setConfirmation(""); setEditingPassword(false);
      setMessage("密码已更新，当前设备仍保持登录。其他设备下次登录请使用新密码。");
    } catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return (
    <>
      <PageTitle kicker="PROFILE" title="账户与数据" />
      <section className="training-review-panel"><small>TRAINING REVIEW · 4W</small><h2>训练审核</h2>
        {!plan?<p>先选择一份 Current Plan，才能按计划审核训练记录。</p>:reviewStatus==="loading"?<p role="status">正在读取最近的训练记录…</p>:reviewStatus==="error"?<div><p role="alert">{reviewError}</p><button onClick={()=>setReviewRetry(value=>value+1)}>重试读取</button></div>:reviewStatus==="noHistory"?<p>近 4 周没有已完成且未撤销的训练记录。完成训练后会在这里显示审核依据。</p>:review&&<>
          <p>近 4 周当前计划完成 {review.completedSessions}{review.expectedSessions===null?" 次训练":` / ${review.expectedSessions} 次计划训练`}；跨计划有效训练 {review.performanceSessions} 次。仅依据已完成、未撤销的记录。</p>
          {reviewDiagnostics.excluded>0&&<p className="review-partial">部分历史记录未能读取（{reviewDiagnostics.hydrated}/{reviewDiagnostics.summaries} 条可用）。以下结论仅依据已读取的训练；可重试补全。 <button onClick={()=>setReviewRetry(value=>value+1)}>重试</button></p>}
          <div className="review-findings"><div><h3>近期表现</h3>{review.opportunities.filter(item=>item.title.includes("渐进")).map(item=><ReviewFindingView key={item.title} finding={item} review={review} onSession={onSession}/>)}{!review.opportunities.some(item=>item.title.includes("渐进"))&&<p>暂无足够的同动作、同计量可比记录。</p>}</div>
            <div><h3>训练一致性</h3><p>{review.evidence.find(item=>item.area==="consistency")?.detail}</p><p>{review.evidence.find(item=>item.area==="adherence")?.detail}</p></div>
            <div><h3>需要关注</h3>{review.flags.map(item=><ReviewFindingView key={item.title} finding={item} review={review} onSession={onSession}/>)}{!review.flags.length&&<p>当前没有触发确定性提醒。</p>}</div>
            <div><h3>下一步建议</h3>{review.opportunities.filter(item=>!item.title.includes("渐进")).map(item=><ReviewFindingView key={item.title} finding={item} review={review} onSession={onSession}/>)}{!review.opportunities.some(item=>!item.title.includes("渐进"))&&<p>继续记录，累积可比较的数据。</p>}</div>
          </div>
          {reviewStatus==="insufficient"&&<p className="review-insufficient">数据不足：{review.performanceSessions<2?"近 4 周不足两次有效训练。":"缺少至少两次同动作、同计量方式的可比记录。"}暂不判断训练是否有效。</p>}
          <details><summary>查看审核依据 · {review.evidence.length} 项</summary><ul>{review.evidence.map(item=><li key={item.id}><b>{item.title}</b><p>{item.detail}</p>{item.runIds.slice(-3).map(id=><button key={id} onClick={()=>onSession(id)}>查看训练记录 ↗</button>)}</li>)}</ul></details>
        </>}
      </section>
      <section className="profile-cloud">
        <small>已登录</small>
        <h2>{email}</h2>
        <p>
          计划与训练历史保存在云端。旧版 `training-hub-state-v1`
          仍原样保留在当前浏览器。
        </p>
        {message && <p className="success-copy" role="status">{message}</p>}
        {!editingPassword ? <button className="account-action" onClick={() => { setEditingPassword(true); setMessage(""); }}>修改密码</button> : <form className="password-form" onSubmit={submitPassword}>
          <label>当前密码<input type="password" autoComplete="current-password" minLength={8} required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
          <label>新密码<input type="password" autoComplete="new-password" minLength={8} required value={nextPassword} onChange={event => setNextPassword(event.target.value)} /></label>
          <label>确认新密码<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
          {error && <p className="error-copy">{error}</p>}
          <div><button type="button" className="account-action" onClick={() => { setEditingPassword(false); setError(""); }}>取消</button><button className="primary" disabled={busy}>{busy ? "更新中…" : "更新密码"}</button></div>
        </form>}
        <button className="signout-action" onClick={() => authService.signOut()}>退出登录</button>
      </section>
    </>
  );
}
function ReviewFindingView({finding,review,onSession}:{finding:TrainingReview["flags"][number];review:TrainingReview;onSession:(id:string)=>void}) {
  const evidence=finding.evidenceIds.map(id=>review.evidence.find(item=>item.id===id)).filter((item):item is NonNullable<typeof item>=>Boolean(item));
  const runId=evidence.flatMap(item=>item.runIds).at(-1);
  return <article><b>{finding.title}</b><p>{finding.detail}</p>{evidence.map(item=><small key={item.id}>依据：{item.detail}</small>)}{runId&&<button onClick={()=>onSession(runId)}>查看训练记录 ↗</button>}</article>;
}
function Message({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-screen">
      <section>
        <h1>{title}</h1>
        <p>{children}</p>
      </section>
    </main>
  );
}
function CloudLoading() {
  return (
    <section className="cloud-loading">
      <p className="kicker">CLOUD SYNC</p>
      <h1>正在读取 FORM…</h1>
      <p>计划、进行中训练与历史记录正在恢复。</p>
    </section>
  );
}
function InlineError({
  text,
  retry,
}: {
  text: string;
  retry: () => void | Promise<void>;
}) {
  return (
    <div className="inline-error">
      <span>{text}</span>
      <button onClick={() => void retry()}>重试</button>
    </div>
  );
}
function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="page-title">
      <div>
        <p>{kicker}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
function Row({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="row">
      <b>{title}</b>
      <span>{sub}</span>
    </div>
  );
}
function messageOf(value: unknown) {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return String(value);
}
function numberOrUndefined(value: string) {
  return value === "" ? undefined : Number(value);
}
function formatPlanPrescription(value?: TrainingPrescription) {
  if (!value) return "未设置处方";
  const parts = [
    value.sets === undefined ? undefined : `${value.sets} 组`,
    value.targetReps === undefined ? undefined : `${value.targetReps} 次`,
    value.targetDurationSeconds === undefined ? undefined : `${value.targetDurationSeconds} 秒`,
    value.targetBreaths === undefined ? undefined : `${value.targetBreaths} 次呼吸`,
    value.measurement?.side === "eachSide" ? "每侧" : undefined,
    value.targetLoad === undefined ? undefined : `${value.targetLoad} kg`,
    value.targetRPE === undefined ? undefined : `RPE ${value.targetRPE}`,
    value.targetRIR === undefined ? undefined : `RIR ${value.targetRIR}`,
    value.restSeconds === undefined ? undefined : `休息 ${value.restSeconds} 秒`,
  ];
  return parts.filter(Boolean).join(" · ") || "未设置处方";
}
function findSet(run: WorkoutRunAggregate, id: string) {
  return run.exercises.flatMap((x) => x.sets).find((x) => x.id === id);
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
}
function duration(run: Pick<WorkoutRunAggregate, "startedAt" | "completedAt">) {
  if (!run.startedAt || !run.completedAt) return "—";
  return `${Math.max(1, Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 60000))} min`;
}
function starterDraft(name: string): TrainingPlanDraft {
  const patterns = [
    "Squat",
    "Horizontal Push",
    "Horizontal Pull",
    "Hip Hinge",
    "Vertical Push",
    "Vertical Pull",
    "Squat",
    "Trunk / Core",
    "Carry",
  ] as const;
  const used = new Set<string>();
  const pool = patterns
    .map((pattern) => {
      const exercise =
        exerciseLibraryV1.exercises.find(
          (x) =>
            x.primaryMovementPattern === pattern &&
            x.compoundType === "复合" &&
            !used.has(x.id),
        ) ??
        exerciseLibraryV1.exercises.find(
          (x) => x.primaryMovementPattern === pattern && !used.has(x.id),
        );
      if (exercise) used.add(exercise.id);
      return exercise;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const sessions = Array.from({ length: 3 }, (_, sessionIndex) => ({
    name: `Session ${String.fromCharCode(65 + sessionIndex)}`,
    purpose: ["全身基础力量", "后链与上肢", "单腿与躯干稳定"][sessionIndex],
    order: sessionIndex,
    intents: pool
      .slice(sessionIndex * 3, sessionIndex * 3 + 3)
      .map((exercise, order) => ({
        label: `${exercise.primaryMovementPattern ?? "辅助"} · ${exercise.trainingGoals[0] ?? "strength"}`,
        order,
        movementPattern: exercise.primaryMovementPattern ?? undefined,
        trainingGoal: exercise.trainingGoals[0],
        jointFunctionId: exercise.primaryJointFunctions[0]?.jointFunctionId,
        defaultVariationId: exercise.defaultVariationId,
        prescription: { sets: 3, targetReps: 8, targetRPE: 7, restSeconds: 90 },
        explicitOptionIds: exerciseLibraryV1.variations
          .filter(
            (v) =>
              v.exerciseId === exercise.id &&
              v.id !== exercise.defaultVariationId,
          )
          .slice(0, 3)
          .map((v) => v.id),
      })),
  }));
  return {
    name,
    goalSummary: "建立稳定、可持续的训练节奏",
    cycleName: "基础训练周期",
    cycleFocus: "动作质量与稳定完成",
    sessions,
  };
}
