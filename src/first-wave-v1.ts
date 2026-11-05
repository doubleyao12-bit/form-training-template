// Generated from the approved frozen manifest and FORM-owned content. No external descriptions/media.
import type {ExerciseV03,ExerciseVariationV03} from './schema.v03';
import type {TrainingPrescription} from './domain/training';
export const firstWaveExercises:ExerciseV03[]=[
  {
    "schemaVersion": "0.3",
    "id": "shoulder-external-rotation",
    "nameZh": "弹力带肩外旋",
    "nameEn": "Band Shoulder External Rotation",
    "aliases": [
      "肩外旋",
      "Band External Rotation"
    ],
    "exerciseFamilyId": "shoulder-control",
    "defaultVariationId": "shoulder-external-rotation--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "shoulderExternalRotation",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "孤立",
    "limbConfiguration": "unilateral",
    "movementPlane": "水平面",
    "primaryMuscles": [
      "rotatorCuff"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "stability",
      "motorControl"
    ],
    "primaryCapacity": "肩外旋控制",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "站姿将工作侧上臂保持在体侧、屈肘，以肩外旋拉开固定的弹力带，再受控返回。避免用转体代替肩外旋，次数按每侧记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-hip-adduction",
    "nameZh": "站姿绳索髋内收",
    "nameEn": "Standing Cable Hip Adduction",
    "aliases": [
      "绳索髋内收"
    ],
    "exerciseFamilyId": "isolation-lower",
    "defaultVariationId": "standing-cable-hip-adduction--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "hipAdduction",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "孤立",
    "limbConfiguration": "unilateral",
    "movementPlane": "额状面",
    "primaryMuscles": [
      "adductors"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "strength",
      "stability"
    ],
    "primaryCapacity": "髋内收力量",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "低位滑轮用踝带连接工作腿，站姿保持骨盆与躯干稳定，将股骨向身体中线方向带动，再受控返回。次数按每侧记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-hip-extension",
    "nameZh": "站姿绳索髋后伸",
    "nameEn": "Standing Cable Hip Extension",
    "aliases": [
      "绳索后踢腿",
      "Cable Hip Extension"
    ],
    "exerciseFamilyId": "isolation-lower",
    "defaultVariationId": "standing-cable-hip-extension--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "hipExtension",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "孤立",
    "limbConfiguration": "unilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "gluteusMaximus"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "strength",
      "hypertrophy"
    ],
    "primaryCapacity": "单侧髋伸展",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "低位滑轮用踝带连接工作腿，固定躯干与骨盆，将股骨向后伸展并受控返回。不是身体前倾再站起的髋铰链；次数按每侧记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "single-arm-dumbbell-bench-press",
    "nameZh": "单臂哑铃卧推",
    "nameEn": "Single-Arm Dumbbell Bench Press",
    "aliases": [
      "单手哑铃卧推",
      "One-Arm Dumbbell Bench Press"
    ],
    "exerciseFamilyId": "push-bench",
    "defaultVariationId": "single-arm-dumbbell-bench-press--default",
    "primaryMovementPattern": "Horizontal Push",
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "shoulderHorizontalAdduction",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "elbowExtension",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "unilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "pectoralisMajor",
      "tricepsBrachii"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "strength",
      "stability"
    ],
    "primaryCapacity": "单侧上肢推力",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "仰卧于卧推凳，单手持哑铃完成水平推举，控制躯干不随负重旋转，另一侧不持工作负重。次数按每侧记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-single-arm-dumbbell-overhead-press",
    "nameZh": "站姿单臂哑铃推举",
    "nameEn": "Standing Single-Arm Dumbbell Overhead Press",
    "aliases": [
      "站姿单手哑铃肩推"
    ],
    "exerciseFamilyId": "push-overhead",
    "defaultVariationId": "standing-single-arm-dumbbell-overhead-press--default",
    "primaryMovementPattern": "Vertical Push",
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "shoulderFlexion",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "elbowExtension",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "scapularUpwardRotation",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "unilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "anteriorDeltoid",
      "tricepsBrachii"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "strength",
      "hypertrophy",
      "stability"
    ],
    "primaryCapacity": "单侧过顶推力",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "站姿单手将哑铃从肩侧推向头顶并受控下放，保持肋骨与骨盆受控；不借坐姿靠背或下肢蹬伸。次数按每侧记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "cable-straight-arm-pulldown",
    "nameZh": "绳索直臂下拉",
    "nameEn": "Cable Straight-Arm Pulldown",
    "aliases": [
      "绳索直臂肩伸",
      "Straight Arm Cable Pulldown"
    ],
    "exerciseFamilyId": "pull-straight-arm",
    "defaultVariationId": "cable-straight-arm-pulldown--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "shoulderExtension",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "孤立",
    "limbConfiguration": "bilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "latissimusDorsi"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "hypertrophy"
    ],
    "primaryCapacity": "直臂肩伸力量",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "站于高位滑轮前双手持绳把，肘角基本固定，以肩伸展将手臂带向髋前，再受控返回；不是屈肘将把手拉向胸口的高位下拉。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-chest-press",
    "nameZh": "站姿绳索推胸",
    "nameEn": "Standing Cable Chest Press",
    "aliases": [
      "站姿拉力器推胸"
    ],
    "exerciseFamilyId": "push-standing-horizontal",
    "defaultVariationId": "standing-cable-chest-press--default",
    "primaryMovementPattern": "Horizontal Push",
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "shoulderHorizontalAdduction",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "elbowExtension",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "trunkAntiExtension",
        "role": "isometric"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "bilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "pectoralisMajor",
      "tricepsBrachii"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "strength",
      "stability"
    ],
    "primaryCapacity": "站姿推力与躯干控制",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "双手持绳索把手，以平行或前后站位保持身体稳定，完成水平推举并受控回收；没有卧凳支撑，也不是固定肘角的夹胸。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "barbell-push-press",
    "nameZh": "杠铃借力推举",
    "nameEn": "Barbell Push Press",
    "aliases": [
      "借力肩推"
    ],
    "exerciseFamilyId": "push-overhead",
    "defaultVariationId": "barbell-push-press--default",
    "primaryMovementPattern": "Vertical Push",
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "kneeExtension",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "hipExtension",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "shoulderFlexion",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "elbowExtension",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "bilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "anteriorDeltoid",
      "quadriceps",
      "gluteusMaximus"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "power",
      "strength"
    ],
    "primaryCapacity": "下肢驱动过顶发力",
    "loadability": "中",
    "technicalComplexity": "高",
    "impactLevel": "低",
    "systemicFatiguePotential": "中",
    "relations": [],
    "reviewFlags": [],
    "notes": "杠铃置肩前，短幅屈髋屈膝后蹬伸，连续将杠铃推至头顶并受控回到肩前；不是完整深蹲接推举，也不是严格肩推。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "single-leg-lateral-hop",
    "nameZh": "单腿侧向连续跳",
    "nameEn": "Single-Leg Lateral Hop",
    "aliases": [
      "同腿侧向连续跳"
    ],
    "exerciseFamilyId": "jump-horizontal",
    "defaultVariationId": "single-leg-lateral-hop--default",
    "primaryMovementPattern": "Jump / Landing",
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "landingDeceleration",
        "role": "eccentric"
      },
      {
        "jointFunctionId": "hipAbductionPropulsion",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "anklePlantarflexion",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "unilateral",
    "movementPlane": "额状面",
    "primaryMuscles": [
      "gluteusMedius",
      "quadriceps"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "power",
      "motorControl"
    ],
    "primaryCapacity": "单腿侧向弹性与落地控制",
    "loadability": "中",
    "technicalComplexity": "高",
    "impactLevel": "中",
    "systemicFatiguePotential": "中",
    "relations": [],
    "reviewFlags": [],
    "notes": "同一条腿完成连续小幅侧向跳与落地，控制每次着地后再反弹；不跳到另一条腿。次数按每侧记录，先使用可控幅度。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "inchworm-walkout",
    "nameZh": "手走式爬行准备",
    "nameEn": "Inchworm Walkout",
    "aliases": [
      "手爬式",
      "Inchworm"
    ],
    "exerciseFamilyId": "warmup-pattern",
    "defaultVariationId": "inchworm-walkout--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "hipFlexion",
        "role": "dynamic"
      },
      {
        "jointFunctionId": "trunkAntiExtension",
        "role": "isometric"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "alternating",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "hamstrings",
      "transversusAbdominis"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "mobility",
      "motorControl"
    ],
    "primaryCapacity": "躯干控制与动作准备",
    "loadability": "低",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "从站姿俯身让双手逐步向前走到可控平板位，再将双脚小步跟进并回到站姿。以一次完整往返为一次，不按手步数记录。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "scapular-pull-up",
    "nameZh": "悬垂肩胛引体",
    "nameEn": "Scapular Pull-Up",
    "aliases": [
      "直臂肩胛下沉",
      "Scapular Depression Pull-Up"
    ],
    "exerciseFamilyId": "shoulder-control",
    "defaultVariationId": "scapular-pull-up--default",
    "primaryMovementPattern": null,
    "secondaryMovementPatterns": [],
    "primaryJointFunctions": [
      {
        "jointFunctionId": "scapularDepression",
        "role": "dynamic"
      }
    ],
    "secondaryJointFunctions": [],
    "compoundType": "复合",
    "limbConfiguration": "bilateral",
    "movementPlane": "矢状面",
    "primaryMuscles": [
      "latissimusDorsi",
      "trapezius"
    ],
    "secondaryMuscles": [],
    "trainingGoals": [
      "motorControl",
      "stability"
    ],
    "primaryCapacity": "肩胛下沉控制",
    "loadability": "中",
    "technicalComplexity": "中",
    "impactLevel": "低",
    "systemicFatiguePotential": "低",
    "relations": [],
    "reviewFlags": [],
    "notes": "双手握单杠悬垂，保持肘部基本伸直，以肩胛下沉小幅抬起身体后受控返回；不以屈肘完成完整引体向上。",
    "contraindicationNotes": "先使用可控幅度与负荷；出现锐痛或持续不适时停止并寻求专业评估。",
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  }
];
export const firstWaveVariations:ExerciseVariationV03[]=[
  {
    "schemaVersion": "0.3",
    "id": "bulgarian-split-squat--dumbbell",
    "exerciseId": "bulgarian-split-squat",
    "nameZh": "哑铃保加利亚分腿蹲",
    "nameEn": "Dumbbell Rear-Foot-Elevated Split Squat",
    "aliases": [
      "哑铃后脚抬高分腿蹲",
      "Dumbbell Bulgarian Split Squat"
    ],
    "equipment": [
      "dumbbell",
      "flatBench"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "高",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手在身体两侧持哑铃，后脚置稳固训练凳，前侧腿主导屈髋屈膝下蹲并站起。次数按每侧记录。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "step-up--dumbbell",
    "exerciseId": "step-up",
    "nameZh": "哑铃踏台",
    "nameEn": "Dumbbell Step-Up",
    "aliases": [
      "哑铃上台阶"
    ],
    "equipment": [
      "dumbbell",
      "stepPlatform"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手持哑铃，以踏台上的支撑腿主导站上台面，再受控回到地面。保持踏台稳定，次数按每侧记录。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "reverse-lunge--dumbbell",
    "exerciseId": "reverse-lunge",
    "nameZh": "哑铃后撤弓步",
    "nameEn": "Dumbbell Reverse Lunge",
    "aliases": [
      "负重后撤弓步"
    ],
    "equipment": [
      "dumbbell"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手持哑铃，交替向后撤步并屈髋屈膝，再回到原站位；不是连续向前行走的弓步。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "push-up--incline",
    "exerciseId": "push-up",
    "nameZh": "上斜俯卧撑",
    "nameEn": "Incline Push-Up",
    "aliases": [
      "手抬高俯卧撑",
      "Hands-Elevated Push-Up"
    ],
    "equipment": [
      "bodyweight",
      "flatBench"
    ],
    "loadingSymmetry": "unloaded",
    "loadPlacement": "notApplicable",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手置稳固训练凳，身体保持整体成线，屈肘接近支撑面后推起。抬高的是双手，不是双脚。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "leg-curl--seated-band",
    "exerciseId": "leg-curl",
    "nameZh": "坐姿弹力带腿弯举",
    "nameEn": "Seated Band Hamstring Curl",
    "aliases": [
      "弹力带坐姿屈膝"
    ],
    "equipment": [
      "resistanceBand",
      "flatBench"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "低",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "坐于训练凳，将弹力带固定于可靠锚点并连接脚踝；保持大腿与髋部稳定，通过屈膝将脚跟拉向凳下，再受控伸膝。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "barbell-hip-thrust--dumbbell",
    "exerciseId": "barbell-hip-thrust",
    "nameZh": "哑铃臀推",
    "nameEn": "Dumbbell Hip Thrust",
    "aliases": [
      "哑铃臀部推举"
    ],
    "equipment": [
      "dumbbell",
      "flatBench"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "上背支撑稳固训练凳，将哑铃稳定置于髋前，以髋伸展抬起骨盆，再受控下放；不是仰卧地面臀桥。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "shoulder-external-rotation--default",
    "exerciseId": "shoulder-external-rotation",
    "nameZh": "弹力带肩外旋",
    "nameEn": "Band Shoulder External Rotation",
    "aliases": [
      "肩外旋",
      "Band External Rotation"
    ],
    "equipment": [
      "resistanceBand"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "站姿将工作侧上臂保持在体侧、屈肘，以肩外旋拉开固定的弹力带，再受控返回。避免用转体代替肩外旋，次数按每侧记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "farmers-carry--dumbbell",
    "exerciseId": "farmers-carry",
    "nameZh": "双哑铃农夫行走",
    "nameEn": "Dumbbell Farmer Carry",
    "aliases": [
      "双手哑铃负重行走",
      "Dumbbell Farmers Walk"
    ],
    "equipment": [
      "dumbbell"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "duration"
    ],
    "executionNotes": "双手各持一只哑铃，保持躯干受控，以稳定步态向前行走。记录持续时间与外部负荷，不把距离记为次数。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-hip-adduction--default",
    "exerciseId": "standing-cable-hip-adduction",
    "nameZh": "站姿绳索髋内收",
    "nameEn": "Standing Cable Hip Adduction",
    "aliases": [
      "绳索髋内收"
    ],
    "equipment": [
      "cableMachine"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "低位滑轮用踝带连接工作腿，站姿保持骨盆与躯干稳定，将股骨向身体中线方向带动，再受控返回。次数按每侧记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-hip-extension--default",
    "exerciseId": "standing-cable-hip-extension",
    "nameZh": "站姿绳索髋后伸",
    "nameEn": "Standing Cable Hip Extension",
    "aliases": [
      "绳索后踢腿",
      "Cable Hip Extension"
    ],
    "equipment": [
      "cableMachine"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "低位滑轮用踝带连接工作腿，固定躯干与骨盆，将股骨向后伸展并受控返回。不是身体前倾再站起的髋铰链；次数按每侧记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "single-arm-dumbbell-bench-press--default",
    "exerciseId": "single-arm-dumbbell-bench-press",
    "nameZh": "单臂哑铃卧推",
    "nameEn": "Single-Arm Dumbbell Bench Press",
    "aliases": [
      "单手哑铃卧推",
      "One-Arm Dumbbell Bench Press"
    ],
    "equipment": [
      "dumbbell",
      "flatBenchPress"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "高",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "仰卧于卧推凳，单手持哑铃完成水平推举，控制躯干不随负重旋转，另一侧不持工作负重。次数按每侧记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-single-arm-dumbbell-overhead-press--default",
    "exerciseId": "standing-single-arm-dumbbell-overhead-press",
    "nameZh": "站姿单臂哑铃推举",
    "nameEn": "Standing Single-Arm Dumbbell Overhead Press",
    "aliases": [
      "站姿单手哑铃肩推"
    ],
    "equipment": [
      "dumbbell"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "高",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "站姿单手将哑铃从肩侧推向头顶并受控下放，保持肋骨与骨盆受控；不借坐姿靠背或下肢蹬伸。次数按每侧记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "cable-straight-arm-pulldown--default",
    "exerciseId": "cable-straight-arm-pulldown",
    "nameZh": "绳索直臂下拉",
    "nameEn": "Cable Straight-Arm Pulldown",
    "aliases": [
      "绳索直臂肩伸",
      "Straight Arm Cable Pulldown"
    ],
    "equipment": [
      "cableMachine"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "站于高位滑轮前双手持绳把，肘角基本固定，以肩伸展将手臂带向髋前，再受控返回；不是屈肘将把手拉向胸口的高位下拉。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-cable-chest-press--default",
    "exerciseId": "standing-cable-chest-press",
    "nameZh": "站姿绳索推胸",
    "nameEn": "Standing Cable Chest Press",
    "aliases": [
      "站姿拉力器推胸"
    ],
    "equipment": [
      "cableMachine"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "高",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手持绳索把手，以平行或前后站位保持身体稳定，完成水平推举并受控回收；没有卧凳支撑，也不是固定肘角的夹胸。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "barbell-push-press--default",
    "exerciseId": "barbell-push-press",
    "nameZh": "杠铃借力推举",
    "nameEn": "Barbell Push Press",
    "aliases": [
      "借力肩推"
    ],
    "equipment": [
      "barbell"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "杠铃置肩前，短幅屈髋屈膝后蹬伸，连续将杠铃推至头顶并受控回到肩前；不是完整深蹲接推举，也不是严格肩推。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "chest-supported-row--machine",
    "exerciseId": "chest-supported-row",
    "nameZh": "胸托器械划船",
    "nameEn": "Chest-Supported Machine Row",
    "aliases": [
      "器械胸托划船"
    ],
    "equipment": [
      "chestSupportedRowMachine"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "低",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "调整器械使胸部稳定贴靠支撑垫，双臂将把手拉向躯干并受控回放；保持胸托，不用离垫后仰代替划船。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "standing-calf-raise--seated-machine",
    "exerciseId": "standing-calf-raise",
    "nameZh": "坐姿提踵",
    "nameEn": "Seated Calf Raise",
    "aliases": [
      "屈膝提踵"
    ],
    "equipment": [
      "seatedCalfRaiseMachine"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "低",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "使用坐姿提踵机，膝保持屈曲、前脚掌稳定支撑，以踝跖屈抬起脚跟并受控下放；记录机器外部阻力，不记为自重额外负重。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "one-arm-dumbbell-row--landmine",
    "exerciseId": "one-arm-dumbbell-row",
    "nameZh": "单臂地雷架划船",
    "nameEn": "One-Arm Landmine Row",
    "aliases": [
      "单臂杠铃杆划船"
    ],
    "equipment": [
      "barbell",
      "landmine"
    ],
    "loadingSymmetry": "unilateral",
    "loadPlacement": "ipsilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "杠铃一端固定在地雷架，单手握另一端完成划船，非工作手可支撑膝部；保持躯干受控，次数按每侧记录。不是胸托划船。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "dumbbell-bench-press--floor",
    "exerciseId": "dumbbell-bench-press",
    "nameZh": "哑铃地板卧推",
    "nameEn": "Dumbbell Floor Press",
    "aliases": [
      "地板哑铃推举"
    ],
    "equipment": [
      "dumbbell"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "低",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "仰卧地面双手持哑铃完成水平推举，受控下放至上臂接近地面再推起；地面限制下放范围，不需要卧推凳。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "single-leg-lateral-hop--default",
    "exerciseId": "single-leg-lateral-hop",
    "nameZh": "单腿侧向连续跳",
    "nameEn": "Single-Leg Lateral Hop",
    "aliases": [
      "同腿侧向连续跳"
    ],
    "equipment": [
      "bodyweight"
    ],
    "loadingSymmetry": "unloaded",
    "loadPlacement": "notApplicable",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "高",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "同一条腿完成连续小幅侧向跳与落地，控制每次着地后再反弹；不跳到另一条腿。次数按每侧记录，先使用可控幅度。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "inchworm-walkout--default",
    "exerciseId": "inchworm-walkout",
    "nameZh": "手走式爬行准备",
    "nameEn": "Inchworm Walkout",
    "aliases": [
      "手爬式",
      "Inchworm"
    ],
    "equipment": [
      "bodyweight"
    ],
    "loadingSymmetry": "unloaded",
    "loadPlacement": "notApplicable",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "从站姿俯身让双手逐步向前走到可控平板位，再将双脚小步跟进并回到站姿。以一次完整往返为一次，不按手步数记录。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "barbell-good-morning--band",
    "exerciseId": "barbell-good-morning",
    "nameZh": "弹力带早安式",
    "nameEn": "Band Good Morning",
    "aliases": [
      "弹力带髋铰链早安式"
    ],
    "equipment": [
      "resistanceBand"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "central",
    "loadTrackingType": "externalLoad",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "弹力带稳固踩于双脚下并绕过上背，膝保持自然微屈，以髋向后折叠后站起。避免将带子压在颈部，不锁死膝盖。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "forward-lunge--dumbbell",
    "exerciseId": "forward-lunge",
    "nameZh": "哑铃前跨弓步",
    "nameEn": "Dumbbell Forward Lunge",
    "aliases": [
      "哑铃前弓步"
    ],
    "equipment": [
      "dumbbell"
    ],
    "loadingSymmetry": "symmetric",
    "loadPlacement": "bilateral",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手持哑铃，交替向前迈步并屈髋屈膝，再返回原站位；不是连续向前行走的弓步。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "march--wall-supported",
    "exerciseId": "march",
    "nameZh": "扶墙加速提膝练习",
    "nameEn": "Wall-Supported Acceleration March Drill",
    "aliases": [
      "扶墙提膝",
      "Wall March"
    ],
    "equipment": [
      "bodyweight"
    ],
    "loadingSymmetry": "unloaded",
    "loadPlacement": "notApplicable",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手支撑稳固墙面，身体整体适度前倾，交替提膝并落回支撑位；以可控march节奏执行，不混入快速换腿或冲刺。",
    "isDefault": false,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  },
  {
    "schemaVersion": "0.3",
    "id": "scapular-pull-up--default",
    "exerciseId": "scapular-pull-up",
    "nameZh": "悬垂肩胛引体",
    "nameEn": "Scapular Pull-Up",
    "aliases": [
      "直臂肩胛下沉",
      "Scapular Depression Pull-Up"
    ],
    "equipment": [
      "pullUpBar"
    ],
    "loadingSymmetry": "unloaded",
    "loadPlacement": "notApplicable",
    "loadTrackingType": "bodyweight",
    "stabilityDemand": "中",
    "allowedMeasurementModes": [
      "reps"
    ],
    "executionNotes": "双手握单杠悬垂，保持肘部基本伸直，以肩胛下沉小幅抬起身体后受控返回；不以屈肘完成完整引体向上。",
    "isDefault": true,
    "createdAt": "2026-10-21T18:00:00+08:00",
    "updatedAt": "2026-10-21T18:00:00+08:00"
  }
];
export const firstWavePrescriptions:Record<string,TrainingPrescription>={
  "bulgarian-split-squat--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "step-up--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "reverse-lunge--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "push-up--incline": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "leg-curl--seated-band": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "barbell-hip-thrust--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "shoulder-external-rotation--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "farmers-carry--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "duration"
      ],
      "trackLoad": true
    }
  },
  "standing-cable-hip-adduction--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "standing-cable-hip-extension--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "single-arm-dumbbell-bench-press--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "standing-single-arm-dumbbell-overhead-press--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "cable-straight-arm-pulldown--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "standing-cable-chest-press--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "barbell-push-press--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "chest-supported-row--machine": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "standing-calf-raise--seated-machine": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "one-arm-dumbbell-row--landmine": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true,
      "side": "eachSide"
    }
  },
  "dumbbell-bench-press--floor": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "single-leg-lateral-hop--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": false,
      "side": "eachSide"
    }
  },
  "inchworm-walkout--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": false
    }
  },
  "barbell-good-morning--band": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "forward-lunge--dumbbell": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  },
  "march--wall-supported": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": false
    }
  },
  "scapular-pull-up--default": {
    "measurement": {
      "version": 1,
      "types": [
        "reps"
      ],
      "trackLoad": true
    }
  }
};
