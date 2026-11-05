import type { ExerciseVariationV03 } from "./schema.v03";

/** A real equipment execution of the conventional deadlift, not a new Exercise identity. */
export const v21Variations: ExerciseVariationV03[] = [{
  schemaVersion: "0.3", id: "conventional-deadlift--dumbbell", exerciseId: "conventional-deadlift",
  nameZh: "哑铃传统硬拉", nameEn: "Dumbbell Conventional Deadlift", equipment: ["dumbbell"],
  loadingSymmetry: "symmetric", loadPlacement: "bilateral", loadTrackingType: "externalLoad",
  stabilityDemand: "中", executionNotes: "双手各持一只哑铃置于身体两侧；从地面或适当垫高位置起始，屈髋屈膝并保持躯干稳定，站起时共同伸展髋与膝。避免将其做成膝部近乎伸直的罗马尼亚硬拉。",
  isDefault: false, createdAt: "2026-09-30T00:00:00+08:00", updatedAt: "2026-09-30T00:00:00+08:00",
}];
