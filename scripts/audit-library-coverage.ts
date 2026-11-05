import {exerciseLibraryV1 as library} from "../src/library-v1";
import {exerciseBodyCategories,exerciseBodyCategoryIds,exerciseBrowseCategories,exerciseBrowseCategory} from "../src/exercise-taxonomy";
import {reviewedTutorialFor} from "../src/reviewed-tutorials";

const countBy=<T>(items:T[],key:(item:T)=>string)=>Object.fromEntries([...items.reduce((map,item)=>map.set(key(item),(map.get(key(item))??0)+1),new Map<string,number>())].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));
const normalized=new Map<string,string[]>();
for(const exercise of library.exercises){const key=exercise.nameEn.toLowerCase().replace(/[^a-z0-9]/g,"");normalized.set(key,[...(normalized.get(key)??[]),exercise.id]);}
const duplicateNames=[...normalized.entries()].filter(([,owners])=>owners.length>1);
const reviewed=library.variations.filter(variation=>reviewedTutorialFor(variation)).length;
const report={
  totals:{exercises:library.exercises.length,variations:library.variations.length,families:new Set(library.exercises.map(item=>item.exerciseFamilyId).filter(Boolean)).size},
  movementPatterns:countBy(library.exercises,item=>item.primaryMovementPattern??"Unclassified / Accessory"),
  primaryNavigation:Object.fromEntries(exerciseBrowseCategories.map(category=>[`${category.label} / ${category.en}`,library.exercises.filter(item=>exerciseBrowseCategory(item)===category.id).length])),
  secondaryDiscovery:Object.fromEntries(exerciseBodyCategories.map(category=>[`${category.label} / ${category.en}`,library.exercises.filter(item=>exerciseBodyCategoryIds(item).includes(category.id)).length])),
  discoverability:{reachableVariations:library.variations.filter(variation=>{const exercise=library.exercises.find(item=>item.id===variation.exerciseId);return exercise&&(exerciseBrowseCategory(exercise)!==null||exerciseBodyCategoryIds(exercise).length>0);}).length,totalVariations:library.variations.length},
  limbConfiguration:countBy(library.exercises,item=>item.limbConfiguration),
  trainingGoals:countBy(library.exercises.flatMap(item=>item.trainingGoals),item=>item),
  measurementModes:countBy(library.variations.flatMap(item=>item.allowedMeasurementModes??["reps"]),item=>item),
  tutorials:{reviewed,contentDebt:library.variations.length-reviewed,invalidExposed:library.variations.filter(item=>Boolean(item.tutorialUrl)!==Boolean(reviewedTutorialFor(item))).map(item=>item.id)},
  duplicateNames,
};
console.log(JSON.stringify(report,null,2));
