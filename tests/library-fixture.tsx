// Local synthetic catalog only. No Auth/cloud reads or writes.
import React from "react";
import {createRoot} from "react-dom/client";
import {ExercisesPage} from "../src/CloudTrainingApp";
import {ExercisePicker} from "../src/ExercisePicker";
import "../src/styles.css";

const mode=new URLSearchParams(location.search).get("mode")??"library";
const intent={label:"核心稳定",order:0,movementPattern:"Trunk / Core" as const,trainingGoal:"stability" as const,defaultVariationId:"front-plank--default",explicitOptionIds:[]};
createRoot(document.getElementById("root")!).render(<div className="v1"><main className="v1-main">{mode==="picker"?<ExercisePicker intent={intent} currentId="front-plank--default" selectedIds={[]} choose={async()=>{}} close={()=>{}}/>:<ExercisesPage onSession={()=>{}}/>}</main></div>);
