import {exerciseLibraryV1} from "./library-v1";
import {searchExerciseLibrary} from "./exercise-search";
// Shared matching only: callers retain category, warm-up and replacement restrictions.
export function matchesAction(id:string,query:string){
  return searchExerciseLibrary(exerciseLibraryV1,query).some(result=>result.matchingVariationIds.includes(id));
}
