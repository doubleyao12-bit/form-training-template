export type SaveState = "Saved" | "Saving" | "Retry";
export function aggregateSaveState(pending: number, failed: number, operationFailed = false): SaveState {
  return failed || operationFailed ? "Retry" : pending ? "Saving" : "Saved";
}
