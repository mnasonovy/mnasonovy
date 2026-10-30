import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ModalForm } from '@/components/modal-form'
import { SceneAdmireButton } from '@/components/scene-admire-button'
import { CampfireSync } from '@/components/campfire-sync'

async function requireUser(){const supabase=await createClient();const{data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)throw new Error('Not authenticated');return{supabase,userId}}
function localDateInZone(timeZone:string){try{const parts=new Intl.DateTimeFormat('ru-RU',{timeZone,day:'2-digit',month:'short'}).formatToParts(new Date());const d=parts.find(p=>p.type==='day')?.value??'';const m=parts.find(p=>p.type==='month')?.value?.replace('.','')??'';return `${d} ${m}`}catch{return new Date().toISOString().slice(5,10)}}
function localHourInZone(timeZone:string){try{return Number(new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',hour12:false}).format(new Date()).replace(/^24$/,'0'))}catch{return new Date().getHours()}}

async function createBranch(formData:FormData){'use server';const{supabase,userId}=await requireUser();const name=String(formData.get('name')??'').trim().slice(0,80);if(!name)return;const{error}=await supabase.from('branches').insert({user_id:userId,name,icon:String(formData.get('icon')||'🌿').slice(0,8),color:'#c9825b'});if(error)throw error;revalidatePath('/today');revalidatePath('/map')}
async function createQuest(formData:FormData){'use server';const{supabase,userId}=await requireUser();const title=String(formData.get('title')??'').trim().slice(0,180);if(!title)return;const max=Math.max(1,Number(formData.get('max')||1));const{error}=await supabase.from('quests').insert({user_id:userId,branch_id:String(formData.get('branchId')||'')||null,title,description:String(formData.get('description')||'').trim().slice(0,1000),quest_type:String(formData.get('type')||'side'),max_progress:max,progress:0,unit:String(formData.get('unit')||'').slice(0,24),xp_reward:Math.max(0,Number(formData.get('xp')||100))});if(error)throw error;revalidatePath('/today');revalidatePath('/quests');revalidatePath('/progress')}
async function createDailyTemplate(formData:FormData){'use server';const{supabase}=await requireUser();const title=String(formData.get('title')??'').trim().slice(0,120);if(!title)return;const branchId=String(formData.get('branchId')||'')||null;const xp=Math.max(0,Number(formData.get('xp')||50));const items=String(formData.get('items')||'').split(/\r?\n/).map(item=>item.trim().slice(0,180)).filter(Boolean);const{error}=await supabase.rpc('create_daily_template',{p_title:title,p_branch_id:branchId,p_xp_reward:xp,p_items:items});if(error)throw error;revalidatePath('/today')}
async function toggleDailyItem(id:string,completed:boolean){'use server';const{supabase}=await requireUser();const{error}=await supabase.rpc('toggle_daily_item',{p_item_id:id,p_completed:completed,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/today')}
async function setProgress(id:string,value:number){'use server';const{supabase}=await requireUser();const{error}=await supabase.rpc('set_quest_progress',{p_quest_id:id,p_progress:value,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/today');revalidatePath('/quests');revalidatePath('/progress')}
async function complete(id:string){'use server';const{supabase}=await requireUser();const{error}=await supabase.rpc('complete_quest',{p_quest_id:id,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/today');revalidatePath('/quests');revalidatePath('/progress')}
async function reopen(id:string){'use server';const{supabase}=await requireUser();const{error}=await supabase.rpc('reopen_quest',{p_quest_id:id,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/today');revalidatePath('/quests');revalidatePath('/progress')}

function QuestControls({q,mini=false}:{q:any;mini?:boolean}){const p=Number(q.progress),max=Math.max(1,Number(q.max_progress));if(q.status==='completed')return <form action={reopen.bind(null,q.id)}><button className="hudArrow">↶</button></form>;return <div className="questMiniActions">{max>1&&<form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="hudArrow" aria-label="Увеличить прогресс">›</button></form>}{!mini&&<form action={complete.bind(null,q.id)}><button className="hudComplete">Готово</button></form>}</div>}

export default async function TodayPage(){
 const{supabase,userId}=await requireUser()
 const{data:profile}=await supabase.from('profiles').select('timezone,display_name').eq('id',userId).maybeSingle()
 const timeZone=profile?.timezone||'UTC',displayName=profile?.display_name||'Странник',localDate=localDateInZone(timeZone),hour=localHourInZone(timeZone)
 const{error:materializeError}=await supabase.rpc('materialize_daily_instances',{p_local_date:new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});if(materializeError)throw materializeError
 const[{data:quests},{data:branches},{data:ledger},{data:dailyInstances},{data:dailyTemplates},{data:arcs},{data:nodes}]=await Promise.all([
  supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
  supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
  supabase.from('xp_ledger').select('amount').eq('user_id',userId),
  supabase.from('daily_instances').select('*').eq('user_id',userId).order('local_date',{ascending:false}).limit(12),
  supabase.from('daily_templates').select('*').eq('user_id',userId).order('created_at'),
  supabase.from('arcs').select('*').eq('user_id',userId).eq('status','active').order('sort_order'),
  supabase.from('progression_nodes').select('*').eq('user_id',userId).order('sort_order'),
 ])
 const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const todays=(dailyInstances??[]).filter(x=>x.local_date===todayKey)
 const dailyIds=todays.map(x=>x.id);let dailyItems:any[]=[];if(dailyIds.length){const{data,error}=await supabase.from('daily_instance_items').select('*').eq('user_id',userId).in('instance_id',dailyIds).order('sort_order');if(error)throw error;dailyItems=data??[]}
 const xp=(ledger??[]).reduce((s,r)=>s+Number(r.amount),0),active=(quests??[]).filter(q=>q.status==='active'),focus=active.find(q=>q.quest_type==='main')??active[0]
 const branchById=new Map((branches??[]).map(b=>[b.id,b])),templateById=new Map((dailyTemplates??[]).map(t=>[t.id,t])),itemsByInstance=new Map<string,any[]>()
 for(const item of dailyItems){const a=itemsByInstance.get(item.instance_id)??[];a.push(item);itemsByInstance.set(item.instance_id,a)}
 const completedDaily=todays.filter(x=>x.status==='completed').length,totalDaily=todays.length,focusPct=focus?Math.round(Number(focus.progress)/Math.max(1,Number(focus.max_progress))*100):0
 const fireIntensity=Math.max(.18,Math.min(1,.25+(totalDaily?completedDaily/totalDaily:0)*.35+(focusPct/100)*.4))
 const activeArc=(arcs??[])[0],arcNodes=activeArc?(nodes??[]).filter(n=>n.arc_id===activeArc.id):[],arcDone=arcNodes.filter(n=>n.status==='completed').length,arcPct=arcNodes.length?Math.round(arcDone/arcNodes.length*100):0
 const greeting=hour>=5&&hour<11?'Доброе утро':hour>=11&&hour<17?'Добрый день':hour>=17&&hour<22?'Добрый вечер':'Доброй ночи'
 const questForm=<form className="form" action={createQuest}><div className="field"><label>Название</label><input className="input" name="title" required/></div><div className="field"><label>Описание</label><textarea className="input" name="description"/></div><div className="grid grid2"><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Тип</label><select className="input" name="type" defaultValue="side"><option value="main">Главный</option><option value="medium">Средний</option><option value="side">Побочный</option></select></div></div><div className="grid grid3"><div className="field"><label>Цель</label><input className="input" type="number" min="1" name="max" defaultValue="1"/></div><div className="field"><label>Единица</label><input className="input" name="unit"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="100"/></div></div><button className="btn btnPrimary">Создать квест</button></form>
 const dailyForm=<form className="form" action={createDailyTemplate}><div className="field"><label>Название</label><input className="input" name="title" required/></div><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Пункты — по одному на строку</label><textarea className="input" name="items"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="50"/></div><button className="btn btnPrimary">Добавить</button></form>
 const branchForm=<form className="form" action={createBranch}><div className="grid grid2"><div className="field"><label>Иконка</label><input className="input" name="icon" defaultValue="🌿"/></div><div className="field"><label>Название</label><input className="input" name="name" required/></div></div><button className="btn btnPrimary">Создать ветку</button></form>
 const totalQuestProgress=active.length?Math.round(active.reduce((s,q)=>s+Number(q.progress)/Math.max(1,Number(q.max_progress)),0)/active.length*100):0
 const discipline=Math.min(10,Math.max(1,Math.round((totalDaily?completedDaily/totalDaily:0)*10))),focusStat=Math.min(10,Math.max(1,Math.round((focusPct/100)*10))),growth=Math.min(10,Math.max(1,Math.round(Math.log10(Math.max(10,xp+10))*3)))
 return <div className="todayGame">
  <CampfireSync intensity={fireIntensity}/>
  <section className="gameHero">
   <div className="heroShade"/>
   <div className="heroCopy"><div className="heroDate">Сегодня · {localDate}</div><h1>{greeting}, {displayName}!</h1><p>Новый день — это ещё одна возможность стать ближе к тому, кем ты хочешь быть.</p></div>
   <div className="heroFocusPanel">
    <div className="hudPanelTitle"><span>◎</span><strong>Главный фокус дня</strong></div>
    {focus?<div className="heroFocusBody"><div className="focusRune">{focus.branches?.icon||'✦'}</div><div className="focusMain"><h2>{focus.title}</h2>{focus.description&&<p>{focus.description}</p>}<div className="hudProgress"><span style={{width:`${focusPct}%`}}/></div><div className="focusMeta"><b>{focusPct}%</b><QuestControls q={focus} mini/></div></div></div>:<div className="emptyHud">Создай первый активный квест — он станет главным фокусом.</div>}
   </div>
   <SceneAdmireButton/>
   <div className="heroStats">
    <div><span>☀</span><b>{completedDaily}</b><small>Сегодня</small></div><div><span>⚔</span><b>{active.length}</b><small>Активных</small></div><div><span>◎</span><b>{totalQuestProgress}%</b><small>Квесты</small></div><div><span>ϟ</span><b>{Math.max(0,completedDaily)}</b><small>Серия дней</small></div><div><span>★</span><b>{xp}</b><small>Всего XP</small></div>
   </div>
  </section>

  <section className="hudGrid">
   <article className="gamePanel paperPanel" id="rituals"><header><div><span>▣</span><h2>Ежедневные ритуалы</h2></div><small>{completedDaily}/{totalDaily}</small></header><div className="ritualRows">{todays.length?todays.flatMap(instance=>{const template=templateById.get(instance.template_id),items=itemsByInstance.get(instance.id)??[];return items.map(item=><form action={toggleDailyItem.bind(null,item.id,!item.is_completed)} key={item.id}><button className={`paperRow ${item.is_completed?'done':''}`}><span className="rowIcon">{template?.branch_id?branchById.get(template.branch_id)?.icon:'☀'}</span><span>{item.title}</span><i>{item.is_completed?'✓':''}</i></button></form>) }):<div className="panelEmpty">Добавь первый ежедневный ритуал.</div>}</div><footer><ModalForm triggerLabel="+ Добавить" title="Новый ритуал" eyebrow="Ежедневка" triggerClassName="panelLink">{dailyForm}</ModalForm></footer></article>
   <article className="gamePanel paperPanel"><header><div><span>⚔</span><h2>Активные квесты</h2></div><small>{active.length}</small></header><div className="questRows">{active.length?active.slice(0,6).map(q=>{const pct=Math.round(Number(q.progress)/Math.max(1,Number(q.max_progress))*100);return <div className="paperQuest" key={q.id}><span className="questBadge">{q.branches?.icon||'✦'}</span><div><strong>{q.title}</strong><div className="hudProgress thin"><span style={{width:`${pct}%`}}/></div></div><b>{pct}%</b><QuestControls q={q} mini/></div>}):<div className="panelEmpty">Нет активных квестов.</div>}</div><footer><ModalForm triggerLabel="+ Добавить квест" title="Новый квест" eyebrow="Новая миссия" triggerClassName="panelLink">{questForm}</ModalForm></footer></article>
   <article className="gamePanel darkArc"><header><div><span>✥</span><h2>Текущая арка</h2></div><small>{arcPct}%</small></header>{activeArc?<div className="arcBody"><div className="arcScene"><span>{branchById.get(activeArc.branch_id)?.icon||'✦'}</span><div><small>Глава I</small><strong>{activeArc.title}</strong></div></div>{activeArc.description&&<p>{activeArc.description}</p>}<h3>Этапы ({arcDone}/{arcNodes.length})</h3><div className="bossList">{arcNodes.slice(0,4).map(n=><div key={n.id}><span className={n.status==='completed'?'doneDot':'dot'}/>{n.title}</div>)}</div></div>:<div className="panelEmpty dark">Активной арки пока нет.</div>}<footer><ModalForm triggerLabel="+ Ветка" title="Новая ветка" eyebrow="Новое направление" triggerClassName="panelLink darkLink">{branchForm}</ModalForm></footer></article>
  </section>

  <section className="lowerHud">
   <article className="gamePanel statsPanel"><header><div><span>♥</span><h2>Характеристики</h2></div></header><div className="statRows"><div><span>Дисциплина</span><i><b style={{width:`${discipline*10}%`}}/></i><em>{discipline}/10</em></div><div><span>Фокус</span><i><b style={{width:`${focusStat*10}%`}}/></i><em>{focusStat}/10</em></div><div><span>Развитие</span><i><b style={{width:`${growth*10}%`}}/></i><em>{growth}/10</em></div></div></article>
   <article className="gamePanel inventoryPanel" id="inventory"><header><div><span>♜</span><h2>Инвентарь</h2></div><small>{branches?.length??0}</small></header><div className="inventoryRows">{(branches??[]).slice(0,4).map(b=><div key={b.id}><span>{b.icon}</span><strong>{b.name}</strong></div>)}</div></article>
   <article className="gamePanel equipmentPanel"><header><div><span>⚒</span><h2>Снаряжение</h2></div></header><ul><li>Рабочая система</li><li>Учёба и навыки</li><li>Опыт преподавания</li><li>Спортивная дисциплина</li></ul></article>
   <article className="gamePanel goalPanel"><header><div><span>⌁</span><h2>Цель пути</h2></div></header><p>{activeArc?`Пройти арку «${activeArc.title}» и открыть следующий этап.`:'Создай первую большую арку — она станет твоей главной историей.'}</p><div className="goalSteps"><span>{xp}<small>XP сейчас</small></span><b>→</b><span>{Math.max(xp+500,1000)}<small>следующий рубеж</small></span></div></article>
  </section>
 </div>
}
