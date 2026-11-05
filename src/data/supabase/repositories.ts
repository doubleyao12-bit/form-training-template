import type { TrainingRepositories } from "../repositories";
import { getSupabaseClient } from "./client";
import { SupabaseHistoryRepository } from "./history-repository";
import { SupabasePlanRepository } from "./plan-repository";
import { SupabaseWorkoutRepository } from "./workout-repository";

let repositories: TrainingRepositories | undefined;

export function getTrainingRepositories(): TrainingRepositories {
  if (repositories) return repositories;
  const client = getSupabaseClient();
  repositories = {
    plans: new SupabasePlanRepository(client),
    workouts: new SupabaseWorkoutRepository(client),
    history: new SupabaseHistoryRepository(client),
  };
  return repositories;
}
