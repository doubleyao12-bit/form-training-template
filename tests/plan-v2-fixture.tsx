import React from "react";
import { createRoot } from "react-dom/client";
import { PlanPage } from "../src/CloudTrainingApp";
import { createExampleTrainingPlan } from "../src/training-playbook";
import type { TrainingPlanAggregate } from "../src/domain/training";
import "../src/styles.css";

const draft=createExampleTrainingPlan();
const plan:TrainingPlanAggregate={
  ...draft,id:"fixture-plan",userId:"fixture-user",status:"active",createdAt:"2026-09-01",updatedAt:"2026-09-01",
  sessions:draft.sessions.map((session,index)=>({
    ...session,warmupBlock:index===0?undefined:session.warmupBlock,id:`fixture-session-${index}`,userId:"fixture-user",planId:"fixture-plan",createdAt:"2026-09-01",updatedAt:"2026-09-01",
    intents:session.intents.map((intent,i)=>({
      ...intent,id:`fixture-intent-${index}-${i}`,userId:"fixture-user",sessionTemplateId:`fixture-session-${index}`,
      explicitOptionIds:intent.explicitOptionIds??[],createdAt:"2026-09-01",updatedAt:"2026-09-01",
    })),
  })),
};
createRoot(document.getElementById("root")!).render(<div className="v1"><main className="v1-main"><PlanPage plan={plan} plans={[plan]} playbook={null} activeRun={null} onCreated={async()=>{}} /></main><div className="mobile-nav"><button>Today</button><button className="on">Plan</button><button>Exercises</button><button>History</button><button>Profile</button></div></div>);
