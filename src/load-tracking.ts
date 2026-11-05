import type { LoadTrackingType } from "./schema.v03";

const value = (amount: number | undefined) => amount ?? "—";
const reps = (count: number | undefined) => count ?? "—";

export function formatResistance(loadTrackingType: LoadTrackingType, load: number | undefined) {
  if (loadTrackingType === "bodyweight") return load && load > 0 ? `自重 + ${load} kg` : "自重";
  if (loadTrackingType === "assistedBodyweight") return `辅助 ${value(load)} kg`;
  return `${value(load)} kg`;
}

export function formatPerformance(loadTrackingType: LoadTrackingType, load: number | undefined, repetitions: number | undefined) {
  return `${formatResistance(loadTrackingType, load)} × ${reps(repetitions)}`;
}

export function loadInputCopy(loadTrackingType: LoadTrackingType) {
  if (loadTrackingType === "bodyweight") return { label: "附加 KG", aria: "额外负重", prefix: "自重 +" };
  if (loadTrackingType === "assistedBodyweight") return { label: "辅助 KG", aria: "辅助重量", prefix: "辅助" };
  return { label: "KG", aria: "重量", prefix: "" };
}
