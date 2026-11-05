-- REVIEW ONLY. Replaces all three unapplied historical proposals. Full exact-ID union.
-- Requires Production V2.3 schema; fail closed if catalog already exists.
begin;
do $$ begin if to_regclass('public.form_variation_execution_catalog') is not null then raise exception 'Unexpected pre-existing registry; re-review drift'; end if; end $$;
create table if not exists public.form_variation_execution_catalog (
 variation_id text primary key,
 exercise_id text not null,
 name_zh text not null,
 name_en text not null,
 load_tracking_type text not null check(load_tracking_type in ('externalLoad','bodyweight','assistedBodyweight')),
 allowed_modes text[] not null check(cardinality(allowed_modes)>0 and allowed_modes <@ array['reps','duration','breaths']::text[]),
 default_measurement jsonb not null check(jsonb_typeof(default_measurement)='object')
);
alter table public.form_variation_execution_catalog enable row level security;
revoke all on public.form_variation_execution_catalog from public,anon,authenticated;
grant select on public.form_variation_execution_catalog to authenticated;
drop policy if exists form_execution_catalog_read on public.form_variation_execution_catalog;
create policy form_execution_catalog_read on public.form_variation_execution_catalog for select to authenticated using (true);

insert into public.form_variation_execution_catalog(variation_id,exercise_id,name_zh,name_en,load_tracking_type,allowed_modes,default_measurement) values
('back-squat--legacy-default','back-squat','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('safety-bar-squat--legacy-default','safety-bar-squat','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('box-squat--legacy-default','box-squat','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('front-squat--legacy-default','front-squat','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('goblet-squat--legacy-default','goblet-squat','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('split-squat--legacy-default','split-squat','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('bulgarian-split-squat--legacy-default','bulgarian-split-squat','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('reverse-lunge--legacy-default','reverse-lunge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('forward-lunge--legacy-default','forward-lunge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('walking-lunge--legacy-default','walking-lunge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lateral-lunge--legacy-default','lateral-lunge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('step-up--legacy-default','step-up','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('step-down--legacy-default','step-down','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('conventional-deadlift--legacy-default','conventional-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('sumo-deadlift--legacy-default','sumo-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('trap-bar-deadlift--legacy-default','trap-bar-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('romanian-deadlift--legacy-default','romanian-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-romanian-deadlift--legacy-default','dumbbell-romanian-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-romanian-deadlift--legacy-default','single-leg-romanian-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('kickstand-romanian-deadlift--legacy-default','kickstand-romanian-deadlift','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-hip-thrust--legacy-default','barbell-hip-thrust','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('glute-bridge--legacy-default','glute-bridge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-glute-bridge--legacy-default','single-leg-glute-bridge','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-good-morning--legacy-default','barbell-good-morning','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-pull-through--legacy-default','cable-pull-through','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('45-degree-hip-extension--legacy-default','45-degree-hip-extension','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pallof-press--legacy-default','pallof-press','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lateral-bound--legacy-default','lateral-bound','V0.2 默认执行方式','V0.2 Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('biceps-curl--legacy-default','biceps-curl','V0.2 默认执行方式','V0.2 Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-bench-press--default','barbell-bench-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-bench-press--default','dumbbell-bench-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('push-up--default','push-up','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('incline-dumbbell-press--default','incline-dumbbell-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-chest-fly--default','cable-chest-fly','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-overhead-press--default','barbell-overhead-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-shoulder-press--default','dumbbell-shoulder-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('half-kneeling-landmine-press--default','half-kneeling-landmine-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pike-push-up--default','pike-push-up','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-bent-over-row--default','barbell-bent-over-row','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('one-arm-dumbbell-row--default','one-arm-dumbbell-row','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('seated-cable-row--default','seated-cable-row','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('chest-supported-row--default','chest-supported-row','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('inverted-row--default','inverted-row','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pull-up--default','pull-up','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('chin-up--default','chin-up','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lat-pulldown--default','lat-pulldown','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-arm-lat-pulldown--default','single-arm-lat-pulldown','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('farmers-carry--default','farmers-carry','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('suitcase-carry--default','suitcase-carry','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('front-rack-carry--default','front-rack-carry','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('overhead-carry--default','overhead-carry','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('bear-hug-carry--default','bear-hug-carry','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('front-plank--default','front-plank','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('side-plank--default','side-plank','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false,"side":"eachSide"}'::jsonb),
('dead-bug--default','dead-bug','默认执行方式','Default Execution','bodyweight',array['reps','duration'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('bird-dog--default','bird-dog','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-chop--default','cable-chop','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-lift--default','cable-lift','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('hanging-knee-raise--default','hanging-knee-raise','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('countermovement-jump--default','countermovement-jump','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('squat-jump--default','squat-jump','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('box-jump--default','box-jump','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('broad-jump--default','broad-jump','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pogo-jump--default','pogo-jump','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('medicine-ball-chest-pass--default','medicine-ball-chest-pass','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('medicine-ball-overhead-throw--default','medicine-ball-overhead-throw','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('medicine-ball-rotational-throw--default','medicine-ball-rotational-throw','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('medicine-ball-slam--default','medicine-ball-slam','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('bear-crawl--default','bear-crawl','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('crab-walk--default','crab-walk','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('lateral-shuffle--default','lateral-shuffle','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('march--default','march','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('snap-down--default','snap-down','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-stick--default','single-leg-stick','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('forward-run-deceleration--default','forward-run-deceleration','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lateral-cut-stick--default','lateral-cut-stick','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('triceps-pushdown--default','triceps-pushdown','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-lateral-raise--default','dumbbell-lateral-raise','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-rear-delt-fly--default','cable-rear-delt-fly','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('face-pull--default','face-pull','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('leg-extension--default','leg-extension','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('leg-curl--default','leg-curl','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('standing-calf-raise--default','standing-calf-raise','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('side-lying-hip-abduction--default','side-lying-hip-abduction','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pull-up--assisted','pull-up','器械辅助引体向上','Machine-Assisted Pull-Up','assistedBodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('wall-breathing','wall-breathing','90/90 靠墙呼吸','90/90 Feet-on-Wall Breathing','bodyweight',array['breaths','duration'],'{"version":1,"types":["breaths"],"trackLoad":false}'::jsonb),
('dead-bug-breathing','dead-bug-breathing','死虫式呼吸','Dead Bug Breathing','bodyweight',array['breaths','duration'],'{"version":1,"types":["breaths"],"trackLoad":false}'::jsonb),
('hip-switch','hip-switch','90/90 髋部转换','90/90 Hip Switch','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('shin-box','shin-box','坐姿髋部转换','Shin Box Switch','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('adductor-rockback','adductor-rockback','内收肌后坐','Adductor Rock Back','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lateral-lunge-mobility','lateral-lunge-mobility','侧向弓步活动','Lateral Lunge Mobility','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dynamic-deep-squat','dynamic-deep-squat','动态深蹲活动','Dynamic Deep Squat Mobility','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('squat-to-stand','squat-to-stand','深蹲起立','Squat to Stand','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('bodyweight-hip-hinge','bodyweight-hip-hinge','徒手髋铰链','Bodyweight Hip Hinge','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('glute-bridge-prep','glute-bridge-prep','臀桥准备','Glute Bridge Preparation','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('thoracic-rotation','thoracic-rotation','跪姿胸椎旋转','Kneeling Thoracic Rotation','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('open-book','open-book','侧卧开书','Side-Lying Open Book','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('scapular-pushup','scapular-pushup','肩胛俯卧撑','Scapular Push-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('band-row','band-row','弹力带划船','Resistance Band Row','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('band-pull-apart','band-pull-apart','弹力带拉开','Band Pull-Apart','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('worlds-greatest-stretch','worlds-greatest-stretch','世界最佳拉伸','World''s Greatest Stretch','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('reverse-lunge-rotation','reverse-lunge-rotation','后撤弓步转体','Reverse Lunge with Rotation','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('vertical-jump','vertical-jump','垂直跳','Vertical Jump','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lateral-band-walk--default','lateral-band-walk','恢复强化周默认方式','Recovery Week Default','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('standing-hip-abduction--default','standing-hip-abduction','恢复强化周默认方式','Recovery Week Default','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-knee-drive-hold--default','single-leg-knee-drive-hold','恢复强化周默认方式','Recovery Week Default','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false,"side":"eachSide"}'::jsonb),
('short-lever-copenhagen-plank--default','short-lever-copenhagen-plank','恢复强化周默认方式','Recovery Week Default','bodyweight',array['duration','reps'],'{"version":1,"types":["duration"],"trackLoad":false,"side":"eachSide"}'::jsonb),
('goblet-box-squat--default','goblet-box-squat','恢复强化周默认方式','Recovery Week Default','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('easy-walk-or-cycle--default','easy-walk-or-cycle','恢复强化周默认方式','Recovery Week Default','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('assisted-nordic-curl--default','assisted-nordic-curl','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('eccentric-nordic-curl--default','eccentric-nordic-curl','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('nordic-curl--default','nordic-curl','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('slider-leg-curl--default','slider-leg-curl','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('stability-ball-leg-curl--default','stability-ball-leg-curl','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('body-saw--default','body-saw','默认执行方式','Default Execution','bodyweight',array['reps','duration'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('ab-wheel-rollout--default','ab-wheel-rollout','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('stability-ball-rollout--default','stability-ball-rollout','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('hollow-body-hold--default','hollow-body-hold','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('hollow-rock--default','hollow-rock','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pallof-hold--default','pallof-hold','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('half-kneeling-pallof-press--default','half-kneeling-pallof-press','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('plank-shoulder-tap--default','plank-shoulder-tap','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('landmine-rotation--default','landmine-rotation','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('half-get-up--default','half-get-up','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('turkish-get-up--default','turkish-get-up','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('renegade-row--default','renegade-row','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-thruster--default','dumbbell-thruster','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cossack-squat--default','cossack-squat','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('assisted-pistol-squat--default','assisted-pistol-squat','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('box-pistol-squat--default','box-pistol-squat','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('kettlebell-swing--default','kettlebell-swing','默认执行方式','Default Execution','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('sled-push--default','sled-push','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('backward-sled-drag--default','backward-sled-drag','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('wall-slide--default','wall-slide','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('prone-y-raise--default','prone-y-raise','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('kettlebell-arm-bar--default','kettlebell-arm-bar','默认执行方式','Default Execution','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('ankle-dorsiflexion-mobilization--default','ankle-dorsiflexion-mobilization','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('active-straight-leg-raise--default','active-straight-leg-raise','默认执行方式','Default Execution','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('couch-stretch--default','couch-stretch','默认执行方式','Default Execution','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false,"side":"eachSide"}'::jsonb),
('nordic-curl--loaded','nordic-curl','负重北欧腿弯举','Loaded Nordic Hamstring Curl','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('front-rack-carry--single-kettlebell','front-rack-carry','单壶铃前架行走','Single-Kettlebell Front Rack Carry','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('overhead-carry--waiter','overhead-carry','单臂侍者行走','Waiter Carry','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('bear-crawl--backward','bear-crawl','后退熊爬','Backward Bear Crawl','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('bear-crawl--lateral','bear-crawl','侧向熊爬','Lateral Bear Crawl','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('conventional-deadlift--dumbbell','conventional-deadlift','哑铃传统硬拉','Dumbbell Conventional Deadlift','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('double-dumbbell-front-rack-squat--default','double-dumbbell-front-rack-squat','双哑铃前架深蹲','Double-Dumbbell Front-Rack Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-squat--default','smith-squat','史密斯机深蹲','Smith Machine Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('belt-squat--default','belt-squat','腰带深蹲','Belt Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('hack-squat--default','hack-squat','哈克深蹲','Hack Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('45-degree-leg-press--default','45-degree-leg-press','45度腿举','45-Degree Leg Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-press--default','single-leg-press','单腿腿举','Single-Leg Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('double-dumbbell-split-squat--default','double-dumbbell-split-squat','双哑铃分腿蹲','Double-Dumbbell Split Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-split-squat--default','barbell-split-squat','杠铃分腿蹲','Barbell Split Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('double-dumbbell-bulgarian-split-squat--default','double-dumbbell-bulgarian-split-squat','双哑铃保加利亚分腿蹲','Double-Dumbbell Bulgarian Split Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-bulgarian-split-squat--default','smith-bulgarian-split-squat','史密斯机保加利亚分腿蹲','Smith Machine Bulgarian Split Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-reverse-lunge--default','dumbbell-reverse-lunge','双哑铃后撤弓步','Double-Dumbbell Reverse Lunge','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-walking-lunge--default','dumbbell-walking-lunge','双哑铃行走弓步','Double-Dumbbell Walking Lunge','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-step-up--default','dumbbell-step-up','双哑铃登台阶','Double-Dumbbell Step-Up','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-romanian-deadlift--default','smith-romanian-deadlift','史密斯机罗马尼亚硬拉','Smith Machine Romanian Deadlift','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-hip-thrust--default','smith-hip-thrust','史密斯机臀推','Smith Machine Hip Thrust','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('dumbbell-hip-thrust--default','dumbbell-hip-thrust','哑铃臀推','Dumbbell Hip Thrust','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('safety-bar-good-morning--default','safety-bar-good-morning','安全杠早安式','Safety Bar Good Morning','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('seated-leg-curl--default','seated-leg-curl','坐姿腿弯举','Seated Leg Curl','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('lying-leg-curl--default','lying-leg-curl','俯卧腿弯举','Lying Leg Curl','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('ghd-hip-extension--default','ghd-hip-extension','GHD 髋伸展','GHD Hip Extension','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('one-arm-dumbbell-overhead-press--default','one-arm-dumbbell-overhead-press','单臂哑铃肩上推举','One-Arm Dumbbell Overhead Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('seated-dumbbell-shoulder-press--default','seated-dumbbell-shoulder-press','坐姿双哑铃肩上推举','Seated Dumbbell Shoulder Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-kettlebell-overhead-press--default','single-kettlebell-overhead-press','单臂壶铃肩上推举','Single-Arm Kettlebell Overhead Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-shoulder-press--default','smith-shoulder-press','史密斯机肩上推举','Smith Machine Shoulder Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('standing-one-arm-landmine-press--default','standing-one-arm-landmine-press','站姿单臂地雷杠推举','Standing One-Arm Landmine Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('two-hand-landmine-press--default','two-hand-landmine-press','站姿双手地雷杠推举','Standing Two-Hand Landmine Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-push-press--default','barbell-push-press','杠铃借力推举','Barbell Push Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pendlay-row--default','pendlay-row','杠铃潘德雷划船','Pendlay Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('double-dumbbell-bent-over-row--default','double-dumbbell-bent-over-row','双哑铃俯身划船','Double-Dumbbell Bent-Over Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('one-arm-cable-row--default','one-arm-cable-row','单臂拉力器划船','One-Arm Cable Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('landmine-tbar-row--default','landmine-tbar-row','地雷杠 T 杠划船','Landmine T-Bar Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('machine-row--default','machine-row','坐姿器械划船','Seated Row Machine','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('ring-row--default','ring-row','吊环反向划船','Ring Inverted Row','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('incline-barbell-bench-press--default','incline-barbell-bench-press','上斜杠铃卧推','Incline Barbell Bench Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-flat-bench-press--default','smith-flat-bench-press','史密斯机平板卧推','Smith Machine Flat Bench Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('smith-incline-bench-press--default','smith-incline-bench-press','史密斯机上斜卧推','Smith Machine Incline Bench Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-floor-press--default','barbell-floor-press','杠铃地板卧推','Barbell Floor Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('close-grip-bench-press--default','close-grip-bench-press','窄握杠铃卧推','Close-Grip Barbell Bench Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('hands-elevated-push-up--default','hands-elevated-push-up','抬高手俯卧撑','Hands-Elevated Push-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('feet-elevated-push-up--default','feet-elevated-push-up','抬高脚俯卧撑','Feet-Elevated Push-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('seated-chest-press-machine--default','seated-chest-press-machine','坐姿器械胸推','Seated Chest Press Machine','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('cable-chest-press--default','cable-chest-press','站姿拉力器胸推','Standing Cable Chest Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('neutral-grip-pull-up--default','neutral-grip-pull-up','中立握引体向上','Neutral-Grip Pull-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('neutral-grip-lat-pulldown--default','neutral-grip-lat-pulldown','中立握高位下拉','Neutral-Grip Lat Pulldown','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('half-kneeling-one-arm-pulldown--default','half-kneeling-one-arm-pulldown','半跪姿单臂拉力器下拉','Half-Kneeling One-Arm Cable Pulldown','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('straight-arm-pulldown--default','straight-arm-pulldown','直臂下压','Straight-Arm Cable Pulldown','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('side-plank-row--default','side-plank-row','侧平板拉力器划船','Side Plank Cable Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('long-lever-plank--default','long-lever-plank','长杠杆平板支撑','Long-Lever Plank','bodyweight',array['duration'],'{"version":1,"types":["duration"],"trackLoad":false}'::jsonb),
('adductor-machine--default','adductor-machine','器械髋内收','Hip Adductor Machine','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('abductor-machine--default','abductor-machine','器械髋外展','Hip Abductor Machine','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('depth-jump--default','depth-jump','深度跳','Depth Jump','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('skater-jump--default','skater-jump','滑冰跳','Skater Jump','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('repeated-broad-jump--default','repeated-broad-jump','连续立定跳远','Repeated Broad Jump','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pull-up--weighted','pull-up','负重正握引体向上','Weighted Pull-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('pallof-press--band','pallof-press','弹力带帕洛夫抗旋推','Band Pallof Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('goblet-squat--kettlebell','goblet-squat','壶铃高脚杯深蹲','Kettlebell Goblet Squat','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('bulgarian-split-squat--dumbbell','bulgarian-split-squat','哑铃保加利亚分腿蹲','Dumbbell Rear-Foot-Elevated Split Squat','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('step-up--dumbbell','step-up','哑铃踏台','Dumbbell Step-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('reverse-lunge--dumbbell','reverse-lunge','哑铃后撤弓步','Dumbbell Reverse Lunge','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('push-up--incline','push-up','上斜俯卧撑','Incline Push-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('leg-curl--seated-band','leg-curl','坐姿弹力带腿弯举','Seated Band Hamstring Curl','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('barbell-hip-thrust--dumbbell','barbell-hip-thrust','哑铃臀推','Dumbbell Hip Thrust','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('shoulder-external-rotation--default','shoulder-external-rotation','弹力带肩外旋','Band Shoulder External Rotation','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('farmers-carry--dumbbell','farmers-carry','双哑铃农夫行走','Dumbbell Farmer Carry','externalLoad',array['duration'],'{"version":1,"types":["duration"],"trackLoad":true}'::jsonb),
('standing-cable-hip-adduction--default','standing-cable-hip-adduction','站姿绳索髋内收','Standing Cable Hip Adduction','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('standing-cable-hip-extension--default','standing-cable-hip-extension','站姿绳索髋后伸','Standing Cable Hip Extension','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('single-arm-dumbbell-bench-press--default','single-arm-dumbbell-bench-press','单臂哑铃卧推','Single-Arm Dumbbell Bench Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('standing-single-arm-dumbbell-overhead-press--default','standing-single-arm-dumbbell-overhead-press','站姿单臂哑铃推举','Standing Single-Arm Dumbbell Overhead Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('cable-straight-arm-pulldown--default','cable-straight-arm-pulldown','绳索直臂下拉','Cable Straight-Arm Pulldown','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('standing-cable-chest-press--default','standing-cable-chest-press','站姿绳索推胸','Standing Cable Chest Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('chest-supported-row--machine','chest-supported-row','胸托器械划船','Chest-Supported Machine Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('standing-calf-raise--seated-machine','standing-calf-raise','坐姿提踵','Seated Calf Raise','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('one-arm-dumbbell-row--landmine','one-arm-dumbbell-row','单臂地雷架划船','One-Arm Landmine Row','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true,"side":"eachSide"}'::jsonb),
('dumbbell-bench-press--floor','dumbbell-bench-press','哑铃地板卧推','Dumbbell Floor Press','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('single-leg-lateral-hop--default','single-leg-lateral-hop','单腿侧向连续跳','Single-Leg Lateral Hop','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":false,"side":"eachSide"}'::jsonb),
('inchworm-walkout--default','inchworm-walkout','手走式爬行准备','Inchworm Walkout','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":false}'::jsonb),
('barbell-good-morning--band','barbell-good-morning','弹力带早安式','Band Good Morning','externalLoad',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('forward-lunge--dumbbell','forward-lunge','哑铃前跨弓步','Dumbbell Forward Lunge','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb),
('march--wall-supported','march','扶墙加速提膝练习','Wall-Supported Acceleration March Drill','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":false}'::jsonb),
('scapular-pull-up--default','scapular-pull-up','悬垂肩胛引体','Scapular Pull-Up','bodyweight',array['reps'],'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb);
create or replace function public.replace_training_hub_exercise(p_exercise_id uuid,p_expected_version integer,p_variation_id text,p_snapshot jsonb,p_reason text default null,p_note text default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare e public.workout_exercises; r public.workout_runs; v public.form_variation_execution_catalog;
 old_tracking text; s public.workout_sets; desired jsonb; current_measurement jsonb; affected integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into e from public.workout_exercises where id=p_exercise_id and user_id=auth.uid();
 if not found then raise exception 'Workout exercise unavailable'; end if;
 -- Lock parent before children, as reorder/completion do; serialize duplicate checks per run.
 select * into r from public.workout_runs where id=e.workout_run_id and user_id=auth.uid() for update;
 if not found or r.status not in ('prepared','inProgress') then raise exception 'Active workout unavailable'; end if;
 if p_expected_version is null or r.version is distinct from p_expected_version then raise exception 'Workout changed elsewhere. Reload before replacing.' using errcode='40001'; end if;
 select * into e from public.workout_exercises where id=p_exercise_id and user_id=auth.uid() and workout_run_id=r.id for update;
 if not found then raise exception 'Workout exercise unavailable'; end if;
 if e.status not in ('pending','inProgress') then raise exception 'Completed exercise cannot be replaced'; end if;
 select * into v from public.form_variation_execution_catalog where variation_id=p_variation_id;
 if not found then raise exception 'Unknown variation identity'; end if;
 if (jsonb_typeof(p_snapshot)='object' and p_snapshot->>'variationId'=v.variation_id and p_snapshot->>'exerciseId'=v.exercise_id) is not true then raise exception 'Invalid Exercise / Variation pair'; end if;
 if e.selected_variation_id=v.variation_id then raise exception 'Choose a different execution'; end if;
 if exists(select 1 from public.workout_exercises other where other.workout_run_id=r.id and other.user_id=auth.uid() and other.id<>e.id and (other.selected_variation_id=v.variation_id or other.exercise_snapshot->>'exerciseId'=v.exercise_id or exists(select 1 from public.form_variation_execution_catalog c where c.variation_id=other.selected_variation_id and c.exercise_id=v.exercise_id))) then raise exception 'This exercise is already in the workout'; end if;
 select load_tracking_type into old_tracking from public.form_variation_execution_catalog where variation_id=e.selected_variation_id;
 for s in select * from public.workout_sets where workout_exercise_id=e.id and user_id=auth.uid() order by order_index for update loop
  current_measurement=coalesce(s.measurement_snapshot,'{"version":1,"types":["reps"],"trackLoad":true}'::jsonb);
  if jsonb_typeof(current_measurement) is distinct from 'object' or jsonb_typeof(current_measurement->'types') is distinct from 'array' then raise exception 'Invalid measurement'; end if;
  if jsonb_array_length(current_measurement->'types')=0 or exists(select 1 from jsonb_array_elements_text(current_measurement->'types') t where t is null or t not in ('reps','duration','breaths')) then raise exception 'Invalid measurement'; end if;
  desired=v.default_measurement;
  if jsonb_typeof(current_measurement->'types')='array' and jsonb_array_length(current_measurement->'types')>0 and not exists(select 1 from jsonb_array_elements_text(current_measurement->'types') t where not(t=any(v.allowed_modes))) then
   desired=jsonb_set(desired,'{types}',current_measurement->'types');
  end if;
  -- A single exercise snapshot cannot truthfully label sets performed as two executions.
  if s.completed then raise exception 'Recorded completed sets cannot be relabeled. Keep this execution.'; end if;
  if (s.actual_load is not null or s.actual_reps is not null or s.actual_duration_seconds is not null or s.actual_breaths is not null or s.actual_rpe is not null or s.actual_rir is not null)
   and (old_tracking is distinct from v.load_tracking_type or current_measurement is distinct from desired or e.exercise_snapshot->>'exerciseId' is distinct from v.exercise_id) then
   raise exception 'Recorded set semantics differ. Keep this execution or clear unfinished inputs explicitly.';
  end if;
  if current_measurement is distinct from desired or old_tracking is distinct from v.load_tracking_type then
   update public.workout_sets set measurement_snapshot=desired,
    target_load=case when old_tracking is distinct from v.load_tracking_type or not coalesce((desired->>'trackLoad')::boolean,false) then null else target_load end,
    target_reps=case when desired->'types' ? 'reps' then target_reps else null end,
    target_duration_seconds=case when desired->'types' ? 'duration' then target_duration_seconds else null end,
    target_breaths=case when desired->'types' ? 'breaths' then target_breaths else null end,
    version=version+1 where id=s.id and user_id=auth.uid();
  else
   -- Invalidate writes queued against the old execution even when units match.
   update public.workout_sets set version=version+1 where id=s.id and user_id=auth.uid();
  end if;
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'Workout set update failed'; end if;
 end loop;
 update public.workout_exercises set selected_variation_id=v.variation_id,
  exercise_snapshot=p_snapshot||jsonb_build_object('exerciseId',v.exercise_id,'variationId',v.variation_id,'nameZh',v.name_zh,'nameEn',v.name_en),
  replacement_reason=p_reason,replacement_note=p_note where id=e.id and user_id=auth.uid();
 get diagnostics affected = row_count;
 if affected<>1 then raise exception 'Workout exercise update failed'; end if;
 update public.workout_runs set version=version+1 where id=r.id and user_id=auth.uid();
 get diagnostics affected = row_count;
 if affected<>1 then raise exception 'Workout update failed'; end if;
 return r.version+1;
end $$;
revoke all on function public.replace_training_hub_exercise(uuid,integer,text,jsonb,text,text) from public,anon;
grant execute on function public.replace_training_hub_exercise(uuid,integer,text,jsonb,text,text) to authenticated;

create or replace function public.set_training_hub_intent_variation(p_intent_id uuid,p_variation_id text,p_expected_variation_id text,p_prescription jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare i public.training_intents; v public.form_variation_execution_catalog; affected integer;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into i from public.training_intents where id=p_intent_id and user_id=auth.uid() and retired_at is null;
 if not found then raise exception 'Plan intent unavailable';end if;
 -- A session lock serializes duplicate checks across different intent rows.
 perform 1 from public.session_templates where id=i.session_template_id and user_id=auth.uid() and retired_at is null for update;
 if not found then raise exception 'Plan session unavailable';end if;
 select * into i from public.training_intents where id=p_intent_id and user_id=auth.uid() and retired_at is null and session_template_id=i.session_template_id for update;
 if not found then raise exception 'Plan intent unavailable';end if;
 if i.default_variation_id is distinct from p_expected_variation_id then raise exception 'Plan changed elsewhere' using errcode='40001';end if;
 select * into v from public.form_variation_execution_catalog where variation_id=p_variation_id;
 if not found then raise exception 'Unknown variation identity';end if;
 if i.default_variation_id=v.variation_id then raise exception 'Choose a different execution';end if;
 if exists(select 1 from public.training_intents other join public.form_variation_execution_catalog c on c.variation_id=other.default_variation_id where other.session_template_id=i.session_template_id and other.user_id=auth.uid() and other.retired_at is null and other.id<>i.id and c.exercise_id=v.exercise_id) then raise exception 'This exercise is already in the session';end if;
 if p_prescription is not null and jsonb_typeof(p_prescription)<>'object' then raise exception 'Invalid prescription';end if;
 if p_prescription ? 'measurement' then
  if jsonb_typeof(p_prescription->'measurement'->'types') is distinct from 'array' then raise exception 'Invalid measurement';end if;
  if jsonb_array_length(p_prescription->'measurement'->'types')=0 or exists(select 1 from jsonb_array_elements_text(p_prescription->'measurement'->'types') t where t is null or not(t=any(v.allowed_modes))) then raise exception 'Invalid measurement';end if;
 end if;
 update public.training_intents set default_variation_id=v.variation_id,prescription=p_prescription where id=i.id and user_id=auth.uid();
 get diagnostics affected = row_count;
 if affected<>1 then raise exception 'Plan intent update failed';end if;
 return v.variation_id;
end $$;
revoke all on function public.set_training_hub_intent_variation(uuid,text,text,jsonb) from public,anon;
grant execute on function public.set_training_hub_intent_variation(uuid,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
