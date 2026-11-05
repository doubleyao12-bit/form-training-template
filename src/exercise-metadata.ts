import type { TutorialSource } from "./schema.v03";

export interface ExerciseTutorial {
  tutorialUrl: string;
  tutorialSource: TutorialSource;
}

const ACE = "ACE" as const;

/** Direct exercise instructions for exercises used by the current A/B/C/D plan. */
export const exerciseTutorials: Record<string, ExerciseTutorial> = {
  "bird-dog": { tutorialSource: "NASM", tutorialUrl: "https://www.nasm.org/resource-center/exercise-library/bird-dog" },
  "front-plank": { tutorialSource: "NASM", tutorialUrl: "https://www.nasm.org/resource-center/exercise-library/plank" },
  "side-plank": { tutorialSource: "NASM", tutorialUrl: "https://www.nasm.org/resource-center/exercise-library/side-plank" },
  "push-up": { tutorialSource: "NASM", tutorialUrl: "https://www.nasm.org/resource-center/exercise-library/push-up" },
  "goblet-squat": { tutorialSource: "NASM", tutorialUrl: "https://www.nasm.org/resource-center/blog/training/how-to-perform-goblet-squats" },
  "back-squat": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/" },
  "bulgarian-split-squat": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/366/bulgarian-split-squat/" },
  "conventional-deadlift": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/6/deadlift/" },
  "romanian-deadlift": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/continuing-education/certified/may-2025/8865/the-ace-do-it-better-series-the-romanian-deadlift/" },
  "single-leg-romanian-deadlift": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/329/single-leg-romanian-deadlift/" },
  "barbell-bench-press": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/5/chest-press/" },
  "pull-up": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/" },
  "one-arm-dumbbell-row": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/pros/expert-articles/5047/strength-training-workout-for-beginners/" },
  "pallof-press": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/332/standing-anti-rotation-press/" },
  "dead-bug": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/147/supine-dead-bug/" },
  "box-jump": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/pros/expert-articles/5869/explosive-plyometric-workout/" },
  "lateral-bound": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/pros/expert-articles/5869/explosive-plyometric-workout/" },
  "medicine-ball-rotational-throw": { tutorialSource: ACE, tutorialUrl: "" },
  "half-kneeling-landmine-press": { tutorialSource: "NASM", tutorialUrl: "https://blog.nasm.org/workout-plans/sample-preseason-high-school-football-tennis" },
  "lateral-cut-stick": { tutorialSource: "NSCA", tutorialUrl: "" },
  "cable-chop": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/continuing-education/certified/november-2025/9006/spinal-stability-in-the-real-world-when-to-brace-and-when-to-breathe/" },
  "farmers-carry": { tutorialSource: ACE, tutorialUrl: "https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/" },
};

export function tutorialFor(exerciseId: string): ExerciseTutorial | undefined {
  return exerciseTutorials[exerciseId];
}
