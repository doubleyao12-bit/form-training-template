import React from "react";
import { createRoot } from "react-dom/client";
import { PlanImportView } from "../src/CloudTrainingApp";
import type { TrainingPlanAggregate } from "../src/domain/training";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(<div className="v1"><main className="v1-main"><PlanImportView activeRun={null} overwriteTarget={{id:"fixture-plan",name:"Original Plan"} as TrainingPlanAggregate} close={() => {}} applied={async () => {}} /></main><div className="mobile-nav"><button>Today</button><button className="on">Plan</button><button>Exercises</button><button>History</button><button>Profile</button></div></div>);
