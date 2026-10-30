import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ModalForm } from '@/components/modal-form'
import { SceneAdmireButton } from '@/components/scene-admire-button'
import { CampfireSync } from '@/components/campfire-sync'

async function requireUser(){const supabase=await createClient();const{data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)throw new Error('Not authenticated');return{supabase,userId}}
function localDateInZone(timeZone:string){try{const parts=new Intl.DateTimeFormat('ru-RU',{timeZone,day:'2-digit',month:'long',weekday:'long'}).formatToParts(new Date());const d=parts.find(p=>p.type==='day')?.value??'';const m=parts.find(p=>p.type==='month')?.value??'';const w=parts.find(p=>p.type==='weekday')?.value??'';return `${w}, ${d} ${m}`}catch{return new Date().toISOString().slice(0,10)}}
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
 const timeZone=profile?.timezone||'UTC',displayName=profile?.display_name||'Путешественник',localDate=localDateInZone(timeZone),hour=localHourInZone(timeZone)
 const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const{error:materializeError}=await supabase.rpc('materialize_daily_instances',{p_local_date:todayKey});if(materializeError)throw materializeError
 const[{data:quests},{data:branches},{data:ledger},{data:dailyInstances},{data:dailyTemplates},{data:arcs},{data:nodes}]=await Promise.all([
  supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
  supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
  supabase.from('xp_ledger').select('amount').eq('user_id',userId),
  supabase.from('daily_instances').select('*').eq('user_id',userId).eq('local_date',todayKey).order('created_at'),
  supabase.from('daily_templates').select('*').eq('user_id',userId).order('created_at'),
  supabase.from('arcs').select('*').eq('user_id',userId).eq('status','active').order('sort_order'),
  supabase.from('progression_nodes').select('*').eq('user_id',userId).order('sort_order'),
 ])
 const todays=dailyInstances??[]
 const dailyIds=todays.map(x=>x.id);let dailyItems:any[]=[];if(dailyIds.length){const{data,error}=await supabase.from('daily_instance_items').select('*').eq('user_id',userId).in('instance_id',dailyIds).order('sort_order');if(error)throw error;dailyItems=data??[]}
 const xp=(ledger??[]).reduce((s,r)=>s+Number(r.amount),0),active=(quests??[]).filter(q=>q.status==='active'),focus=active.find(q=>q.quest_type==='main')??active[0]
 const branchById=new Map((branches??[]).map(b=>[b.id,b])),templateById=new Map((dailyTemplates??[]).map(t=>[t.id,t])),itemsByInstance=new Map<string,any[]>()
 for(const item of dailyItems){const a=itemsByInstance.get(item.instance_id)??[];a.push(item);itemsByInstance.set(item.instance_id,a)}
 const completedItems=dailyItems.filter(x=>x.is_completed).length,totalItems=dailyItems.length,focusPct=focus?Math.round(Number(focus.progress)/Math.max(1,Number(focus.max_progress))*100):0
 const fireIntensity=Math.max(.18,Math.min(1,.25+(totalItems?completedItems/totalItems:0)*.35+(focusPct/100)*.4))
 const activeArcs=arcs??[]
 const greeting=hour>=5&&hour<11?'Доброе утро':hour>=11&&hour<17?'Добрый день':hour>=17&&hour<22?'Добрый вечер':'Добрый вечер'
 const subtitle=hour>=5&&hour<11?'Новый день — это ещё одна страница твоей истории. Пусть сегодня она будет немного ярче.':hour>=11&&hour<17?'Мир открыт перед тобой — ещё одна страница, полная возможностей. Действуй осознанно и наслаждайся путём.':hour>=17&&hour<22?'Ещё один день ближе к твоей истории. Отдохни, собери мысли и позволь этому вечеру вдохновить на завтра.':'День подходит к концу, и это ещё одна страница твоей истории. Ты сделал шаг к жизни, которую создаёшь.'
 const questForm=<form className="form" action={createQuest}><div className="field"><label>Название</label><input className="input" name="title" required/></div><div className="field"><label>Описание</label><textarea className="input" name="description"/></div><div className="grid grid2"><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Тип</label><select className="input" name="type" defaultValue="side"><option value="main">Главный</option><option value="medium">Средний</option><option value="side">Побочный</option></select></div></div><div className="grid grid3"><div className="field"><label>Цель</label><input className="input" type="number" min="1" name="max" defaultValue="1"/></div><div className="field"><label>Единица</label><input className="input" name="unit"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="100"/></div></div><button className="btn btnPrimary">Создать квест</button></form>
 const dailyForm=<form className="form" action={createDailyTemplate}><div className="field"><label>Название</label><input className="input" name="title" required/></div><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Пункты — по одному на строку</label><textarea className="input" name="items"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="50"/></div><button className="btn btnPrimary">Добавить</button></form>
 const branchForm=<form className="form" action={createBranch}><div className="grid grid2"><div className="field"><label>Иконка</label><input className="input" name="icon" defaultValue="🌿"/></div><div className="field"><label>Название</label><input className="input" name="name" required/></div></div><button className="btn btnPrimary">Создать ветку</button></form>

 return <div className="todayGame referenceToday">
  <CampfireSync intensity={fireIntensity}/>
  <section className="referenceHero">
   <div className="referenceHeroShade"/>
   <div className="referenceHeroCopy">
    <div className="referenceKicker">Сегодня</div>
    <div className="referenceDate">{localDate}</div>
    <h1>{greeting},<br/><span>{displayName}!</span></h1>
    <p>{subtitle}</p>
    <SceneAdmireButton/>
   </div>
  </section>

  <section className="referenceMainGrid">
   <article className="referencePaper referenceFocus">
    <header><div><span>◎</span><h2>Главный фокус</h2></div><small>✎ Изменить</small></header>
    {focus?<div className="referenceFocusBody">
      <div className="referenceFocusArt"><span>{focus.branches?.icon||'✦'}</span></div>
      <div className="referenceFocusCopy"><h3>{focus.title}</h3><p>{focus.description||'Каждый день — ещё один шаг ближе к мастерству, которым я хочу стать.'}</p><div className="referenceProgress"><span style={{width:`${focusPct}%`}}/></div><div className="referenceFocusMeta"><span>{focus.progress} из {focus.max_progress} {focus.unit||'шагов'}</span><b>{focusPct}%</b><QuestControls q={focus}/></div></div>
    </div>:<div className="referenceEmpty">Создай первый активный квест — он станет главным фокусом.</div>}
   </article>

   <article className="referencePaper referenceRituals">
    <header><div><span>☕</span><h2>Ежедневные ритуалы</h2></div><small>{completedItems} из {totalItems}</small></header>
    <div className="referenceRitualList">{dailyItems.length?dailyItems.slice(0,5).map(item=>{const instance=todays.find(x=>x.id===item.instance_id);const template=instance?templateById.get(instance.template_id):null;return <form action={toggleDailyItem.bind(null,item.id,!item.is_completed)} key={item.id}><button className={`referenceRitual ${item.is_completed?'done':''}`}><span className="referenceCheck">{item.is_completed?'✓':''}</span><span className="referenceRitualIcon">{template?.branch_id?branchById.get(template.branch_id)?.icon:'✦'}</span><span>{item.title}</span><i>•••</i></button></form>}):<div className="referenceEmpty small">Добавь первый ежедневный ритуал.</div>}</div>
    <footer><ModalForm triggerLabel="+ Ритуал" title="Новый ритуал" eyebrow="Ежедневка" triggerClassName="referenceTextButton">{dailyForm}</ModalForm></footer>
   </article>

   <article className="referencePaper referenceArcs">
    <header><div><span>▰</span><h2>Текущие арки</h2></div><a href="/map">›</a></header>
    <div className="referenceArcList">{activeArcs.length?activeArcs.slice(0,3).map((arc,index)=>{const aNodes=(nodes??[]).filter(n=>n.arc_id===arc.id);const done=aNodes.filter(n=>n.status==='completed').length;const pct=aNodes.length?Math.round(done/aNodes.length*100):0;const branch=branchById.get(arc.branch_id);return <a href="/map" className="referenceArc" key={arc.id}><div className="referenceArcArt"><span>{branch?.icon||'✦'}</span></div><div><strong>{['I.','II.','III.'][index]} {arc.title}</strong><small>{branch?.name||'Образ жизни'}</small><div className="referenceProgress thin"><span style={{width:`${pct}%`}}/></div></div><b>{pct}%</b></a>}):<div className="referenceEmpty small">Создай первую большую арку.</div>}</div>
    <footer><ModalForm triggerLabel="+ Ветка" title="Новая ветка" eyebrow="Новое направление" triggerClassName="referenceTextButton">{branchForm}</ModalForm></footer>
   </article>
  </section>

  <section className="referenceQuestBoard">
    <div className="referenceQuestHeader"><div><span>⚔</span><h2>Активные квесты</h2></div><div className="referenceFilters"><button>Все <b>{active.length}</b></button><button>Работа</button><button>Личное</button><button>Здоровье</button></div></div>
    <div className="referenceQuestGrid">{active.length?active.slice(0,3).map(q=>{const pct=Math.round(Number(q.progress)/Math.max(1,Number(q.max_progress))*100);return <article className="referenceQuestCard" key={q.id}><div className="referenceQuestArt"><span>{q.branches?.icon||'✦'}</span></div><div className="referenceQuestBody"><strong>{q.title}</strong><small>{q.branches?.name||'Личное'}</small><div className="referenceProgress thin"><span style={{width:`${pct}%`}}/></div><div className="referenceQuestMeta"><span>{q.progress} из {q.max_progress}</span><b>{pct}%</b></div></div><QuestControls q={q} mini/></article>}):<div className="referenceEmpty quest">Доска пока пуста. Самое время повесить первый квест.</div>}
      <ModalForm triggerLabel="＋ Добавить квест" title="Новый квест" eyebrow="Новая миссия" triggerClassName="referenceAddQuest">{questForm}</ModalForm>
    </div>
  </section>
 </div>
}
