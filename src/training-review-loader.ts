import type { WorkoutRunAggregate, WorkoutRunSummary } from "./domain/training";
import type { HistoryRepository } from "./data/repositories";

const timeout = <T>(promise: Promise<T>, milliseconds: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("训练记录读取超时，请重试。")), milliseconds);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

export interface ReviewLoadResult {
  runs: WorkoutRunAggregate[];
  summaryCount: number;
  excluded: { reverted: number; outsideWindow: number; hydrationFailed: number; missingAggregate: number };
}

export async function loadTrainingReviewEvidence(
  history: Pick<HistoryRepository, "listRuns" | "getRun">,
  now = new Date(),
  timeoutMs = 15000,
): Promise<ReviewLoadResult> {
  const cutoff = now.getTime() - 56 * 86400000;
  const recent: WorkoutRunSummary[] = [];
  const excluded = { reverted: 0, outsideWindow: 0, hydrationFailed: 0, missingAggregate: 0 };
  let before: string | undefined;
  for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
    const page = await timeout(history.listRuns({ limit: 60, before }), timeoutMs);
    for (const item of page) {
      if (item.revertedAt) excluded.reverted++;
      else if (!item.completedAt || Date.parse(item.completedAt) < cutoff) excluded.outsideWindow++;
      else recent.push(item);
    }
    const oldest = page.at(-1)?.completedAt;
    if (page.length < 60 || !oldest || Date.parse(oldest) < cutoff) break;
    before = oldest;
  }
  const hydrated = await Promise.allSettled(recent.map(item => timeout(history.getRun(item.id), timeoutMs)));
  const runs: WorkoutRunAggregate[] = [];
  for (const item of hydrated) {
    if (item.status === "rejected") excluded.hydrationFailed++;
    else if (!item.value) excluded.missingAggregate++;
    else runs.push(item.value);
  }
  return { runs, summaryCount: recent.length, excluded };
}
