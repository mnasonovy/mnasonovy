import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ModalForm } from '@/components/modal-form'
import { SceneAdmireButton } from '@/components/scene-admire-button'
import { CampfireSync } from '@/components/campfire-sync'

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) throw new Error('Not authenticated')
  return { supabase, userId }
}

function localDateInZone(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date())
    const get = (type:string) => parts.find(part=>part.type===type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return new Date().toISOString().slice(0,10)
  }
}

function localHourInZone(timeZone: string) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone, hour:'2-digit', hour12:false }).format(new Date()).replace(/^24$/, '0'))
  } catch {
    return new Date().getHours()
  }
}

async function createBranch(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireUser()
  const name = String(formData.get('name') ?? '').trim().slice(0,80)
  if (!name) return
  const { error } = await supabase.from('branches').insert({ user_id:userId, name, icon:String(formData.get('icon') || '🌿').slice(0,8), color:'#c9825b' })
  if (error) throw error
  revalidatePath('/today'); revalidatePath('/map')
}

async function createQuest(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireUser()
  const title = String(formData.get('title') ?? '').trim().slice(0,180)
  if (!title) return
  const max = Math.max(1, Number(formData.get('max') || 1))
  const { error } = await supabase.from('quests').insert({
    user_id:userId,
    branch_id:String(formData.get('branchId') || '') || null,
    title,
    description:String(formData.get('description') || '').trim().slice(0,1000),
    quest_type:String(formData.get('type') || 'side'),
    max_progress:max,
    progress:0,
    unit:String(formData.get('unit') || '').slice(0,24),
    xp_reward:Math.max(0,Number(formData.get('xp') || 100)),
  })
  if (error) throw error
  revalidatePath('/today'); revalidatePath('/quests'); revalidatePath('/progress')
}

async function createDailyTemplate(formData: FormData) {
  'use server'
  const { supabase } = await requireUser()
  const title = String(formData.get('title') ?? '').trim().slice(0,120)
  if (!title) return
  const branchId = String(formData.get('branchId') || '') || null
  const xp = Math.max(0, Number(formData.get('xp') || 50))
  const items = String(formData.get('items') || '').split(/\r?\n/).map(item=>item.trim().slice(0,180)).filter(Boolean)
  const { error } = await supabase.rpc('create_daily_template', { p_title:title, p_branch_id:branchId, p_xp_reward:xp, p_items:items })
  if (error) throw error
  revalidatePath('/today')
}

async function disableDailyTemplate(id:string) {
  'use server'
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('daily_templates').update({ is_active:false }).eq('id',id).eq('user_id',userId)
  if (error) throw error
  revalidatePath('/today')
}

async function toggleDailyItem(id:string,completed:boolean) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('toggle_daily_item',{ p_item_id:id, p_completed:completed, p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today')
}

async function setProgress(id:string,value:number) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('set_quest_progress',{ p_quest_id:id,p_progress:value,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today'); revalidatePath('/quests'); revalidatePath('/progress')
}

async function complete(id:string) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('complete_quest',{ p_quest_id:id,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today'); revalidatePath('/quests'); revalidatePath('/progress')
}

async function reopen(id:string) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('reopen_quest',{ p_quest_id:id,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today'); revalidatePath('/quests'); revalidatePath('/progress')
}

function QuestControls({q, compact=false}:{q:any;compact?:boolean}) {
  const p=Number(q.progress), max=Math.max(1,Number(q.max_progress))
  if(q.status==='completed') return <form action={reopen.bind(null,q.id)}><button className={`fantasyAction ${compact?'isCompact':''}`}>Вернуть</button></form>
  return <div className="questActions">
    {max>1&&<>
      <form action={setProgress.bind(null,q.id,Math.max(0,p-1))}><button className="fantasyAction isSmall" aria-label="Уменьшить прогресс">−</button></form>
      <form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="fantasyAction isSmall" aria-label="Увеличить прогресс">+</button></form>
    </>}
    <form action={complete.bind(null,q.id)}><button className={`fantasyAction isPrimary ${compact?'isCompact':''}`}>Готово</button></form>
  </div>
}

function QuestCard({q}:{q:any}) {
  const p=Number(q.progress), max=Math.max(1,Number(q.max_progress)), pct=Math.round(p/max*100)
  return <article className="questScrollCard">
    <div className="questScrollIcon">{q.branches?.icon || (q.quest_type==='main'?'✦':'⚔')}</div>
    <div className="questScrollBody">
      <div className="questScrollMeta">{q.quest_type==='main'?'Главный':q.quest_type==='medium'?'Средний':'Побочный'} · {q.xp_reward} XP</div>
      <h3>{q.title}</h3>
      {q.description&&<p>{q.description}</p>}
      <div className="fantasyProgress"><span style={{width:`${Math.min(100,pct)}%`}}/></div>
      <div className="questScrollFoot"><span>{p}/{max} {q.unit}</span><QuestControls q={q} compact/></div>
    </div>
  </article>
}

export default async function TodayPage() {
  const { supabase, userId } = await requireUser()
  const { data: profile } = await supabase.from('profiles').select('timezone,display_name').eq('id', userId).maybeSingle()
  const timeZone = profile?.timezone || 'UTC'
  const localDate = localDateInZone(timeZone)
  const localHour = localHourInZone(timeZone)
  const displayName = profile?.display_name || 'Путешественник'

  const { error: materializeError } = await supabase.rpc('materialize_daily_instances',{ p_local_date:localDate })
  if(materializeError) throw materializeError

  const [{data:quests},{data:branches},{data:ledger},{data:dailyInstances},{data:dailyTemplates},{data:arcs},{data:nodes}] = await Promise.all([
    supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
    supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
    supabase.from('xp_ledger').select('amount').eq('user_id',userId),
    supabase.from('daily_instances').select('*').eq('user_id',userId).eq('local_date',localDate).order('created_at'),
    supabase.from('daily_templates').select('*').eq('user_id',userId).order('created_at'),
    supabase.from('arcs').select('*').eq('user_id',userId).eq('status','active').order('sort_order'),
    supabase.from('progression_nodes').select('*').eq('user_id',userId).order('sort_order'),
  ])

  const dailyIds=(dailyInstances??[]).map(instance=>instance.id)
  let dailyItems:any[]=[]
  if(dailyIds.length){const{data,error}=await supabase.from('daily_instance_items').select('*').eq('user_id',userId).in('instance_id',dailyIds).order('sort_order');if(error)throw error;dailyItems=data??[]}

  const xp=(ledger??[]).reduce((sum,row)=>sum+Number(row.amount),0)
  const active=(quests??[]).filter(q=>q.status==='active')
  const focus=active.find(q=>q.quest_type==='main')??active[0]
  const otherActive=focus?active.filter(q=>q.id!==focus.id):active
  const activeDaily=(dailyTemplates??[]).filter(template=>template.is_active)
  const completedDaily=(dailyInstances??[]).filter(instance=>instance.status==='completed').length
  const totalDaily=dailyInstances?.length??0
  const branchById=new Map((branches??[]).map(branch=>[branch.id,branch]))
  const templateById=new Map((dailyTemplates??[]).map(template=>[template.id,template]))
  const itemsByInstance=new Map<string,any[]>()
  for(const item of dailyItems){const current=itemsByInstance.get(item.instance_id)??[];current.push(item);itemsByInstance.set(item.instance_id,current)}

  const focusProgress=focus?Math.round(Number(focus.progress)/Math.max(1,Number(focus.max_progress))*100):0
  const dailyRatio=totalDaily?completedDaily/totalDaily:0
  const focusRatio=focus?Number(focus.progress)/Math.max(1,Number(focus.max_progress)):0
  const fireIntensity=Math.max(.15,Math.min(1,.25+dailyRatio*.35+focusRatio*.4))
  const greeting = localHour>=5&&localHour<11?'Доброе утро':localHour>=11&&localHour<17?'Добрый день':localHour>=17&&localHour<22?'Добрый вечер':'Доброй ночи'

  const questForm=<form className="form" action={createQuest}>
    <div className="field"><label>Название</label><input className="input" name="title" required placeholder="Закрыть 4 лабораторные"/></div>
    <div className="field"><label>Описание</label><textarea className="input" name="description" placeholder="Зачем это важно и какой результат хочешь получить"/></div>
    <div className="grid grid2"><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Тип</label><select className="input" name="type" defaultValue="side"><option value="main">Главный</option><option value="medium">Средний</option><option value="side">Побочный</option></select></div></div>
    <div className="grid grid3"><div className="field"><label>Цель</label><input className="input" type="number" min="1" name="max" defaultValue="1"/></div><div className="field"><label>Единица</label><input className="input" name="unit" placeholder="лабы"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="100"/></div></div>
    <button className="btn btnPrimary">Создать квест</button>
  </form>

  const dailyForm=<form className="form" action={createDailyTemplate}>
    <div className="field"><label>Название</label><input className="input" name="title" placeholder="Утренний запуск" required/></div>
    <div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(branch=><option value={branch.id} key={branch.id}>{branch.icon} {branch.name}</option>)}</select></div>
    <div className="field"><label>Чек-лист — один пункт на строку</label><textarea className="input" name="items" placeholder={'Стакан воды\nРазминка 5 минут\nСпланировать день'}/></div>
    <div className="field"><label>Награда XP</label><input className="input" type="number" min="0" max="1000000" name="xp" defaultValue="50"/></div>
    <button className="btn btnPrimary">Добавить ежедневку</button>
  </form>

  const branchForm=<form className="form" action={createBranch}><div className="grid grid2"><div className="field"><label>Иконка</label><input className="input" name="icon" defaultValue="🌿"/></div><div className="field"><label>Название</label><input className="input" name="name" placeholder="Учёба" required/></div></div><button className="btn btnPrimary">Создать ветку</button></form>

  const dailyContent=(dailyInstances??[]).map(instance=>{
    const template=templateById.get(instance.template_id)
    const items=itemsByInstance.get(instance.id)??[]
    const completed=items.filter(item=>item.is_completed).length
    const branch=template?.branch_id?branchById.get(template.branch_id):null
    return <div className={`ritualGroup ${instance.status==='completed'?'isDone':''}`} key={instance.id}>
      <div className="ritualGroupTitle"><span>{branch?.icon || '✦'}</span><strong>{template?.title??'Ежедневный ритуал'}</strong><small>{completed}/{items.length}</small></div>
      {items.map(item=><form action={toggleDailyItem.bind(null,item.id,!item.is_completed)} key={item.id}><button className={`ritualRow ${item.is_completed?'isDone':''}`} type="submit"><span className="ritualCheck">{item.is_completed?'✓':''}</span><span>{item.title}</span></button></form>)}
    </div>
  })

  const arcContent=(arcs??[]).slice(0,3).map((arc,index)=>{
    const arcNodes=(nodes??[]).filter(node=>node.arc_id===arc.id)
    const done=arcNodes.filter(node=>node.status==='completed').length
    const pct=arcNodes.length?Math.round(done/arcNodes.length*100):0
    const branch=branchById.get(arc.branch_id)
    return <a href="/map" className="arcMini" key={arc.id}>
      <div className="arcMiniArt"><span>{branch?.icon || '✦'}</span></div>
      <div><strong>{index+1}. {arc.title}</strong><small>{branch?.name || 'Арка развития'}</small><div className="fantasyProgress isThin"><span style={{width:`${pct}%`}}/></div></div>
      <b>{pct}%</b>
    </a>
  })

  return <div className="todayExperience">
    <CampfireSync intensity={fireIntensity}/>

    <section className="todayHero">
      <div className="todayHeroCopy">
        <div className="heroDate">Сегодня · {localDate}</div>
        <h1>{greeting},<br/><span>{displayName}!</span></h1>
        <p>Новый день — ещё одна страница твоей истории. Поддерживай огонь маленькими победами и двигай большие арки вперёд.</p>
        <SceneAdmireButton/>
      </div>
      <div className="heroRunes" aria-hidden="true"><span>✦</span><span>ᚱ</span><span>ᛟ</span></div>
    </section>

    <section className="fantasyDashboard">
      <div className="fantasyTopGrid">
        <article className="parchmentPanel focusParchment">
          <div className="parchmentHeading"><div><span className="panelIcon">◎</span><h2>Главный фокус</h2></div>{focus&&<span className="inkMeta">{focus.xp_reward} XP</span>}</div>
          {focus?<div className="focusParchmentBody">
            <div className="focusIllustration">{focus.branches?.icon || '✦'}</div>
            <div className="focusCopy">
              <div className="inkEyebrow">{focus.branches?.name || 'Главная миссия'}</div>
              <h3>{focus.title}</h3>
              {focus.description&&<p>{focus.description}</p>}
              <div className="fantasyProgress"><span style={{width:`${Math.min(100,focusProgress)}%`}}/></div>
              <div className="focusFoot"><span>{focus.progress}/{focus.max_progress} {focus.unit} · {focusProgress}%</span><QuestControls q={focus} compact/></div>
            </div>
          </div>:<div className="inkEmpty"><strong>Главный фокус пока не выбран.</strong><span>Создай квест — первая активная миссия появится здесь.</span></div>}
        </article>

        <article className="parchmentPanel dailyParchment">
          <div className="parchmentHeading"><div><span className="panelIcon">♨</span><h2>Ежедневные ритуалы</h2></div><span className="inkMeta">{completedDaily}/{totalDaily}</span></div>
          <div className="ritualList">{dailyContent.length?dailyContent:<div className="inkEmpty"><strong>Ритуалов пока нет.</strong><span>Добавь первый ежедневный ритуал.</span></div>}</div>
          <div className="panelBottomActions"><ModalForm triggerLabel="+ Ритуал" title="Новая ежедневка" eyebrow="Новый ритуал" triggerClassName="inkButton">{dailyForm}</ModalForm></div>
          {activeDaily.length>0&&<details className="ritualManager"><summary>Управление шаблонами</summary>{activeDaily.map(template=><div className="ritualTemplate" key={template.id}><span>{template.title}</span><form action={disableDailyTemplate.bind(null,template.id)}><button>Отключить</button></form></div>)}</details>}
        </article>

        <article className="parchmentPanel arcsParchment">
          <div className="parchmentHeading"><div><span className="panelIcon">▰</span><h2>Текущие арки</h2></div><a className="inkArrow" href="/map" aria-label="Открыть карту">›</a></div>
          <div className="arcMiniList">{arcContent.length?arcContent:<div className="inkEmpty"><strong>Активных арок пока нет.</strong><span>Создай большую историю на карте развития.</span></div>}</div>
          <div className="panelBottomActions"><ModalForm triggerLabel="+ Ветка" title="Новая ветка" eyebrow="Новое направление" triggerClassName="inkButton">{branchForm}</ModalForm></div>
        </article>
      </div>

      <section className="questBoard">
        <div className="questBoardHeading">
          <div><span className="boardSwords">⚔</span><div><div className="inkEyebrow">Доска поручений</div><h2>Активные квесты</h2></div></div>
          <div className="questBoardTools"><span>{active.length} в пути</span><ModalForm triggerLabel="+ Добавить квест" title="Новый квест" eyebrow="Новая миссия" triggerClassName="questAddScroll">{questForm}</ModalForm></div>
        </div>
        <div className="questCardGrid">
          {otherActive.length?otherActive.slice(0,6).map(q=><QuestCard q={q} key={q.id}/>):focus?<div className="boardEmpty">Все остальные квесты завершены. Главный фокус ждёт тебя выше.</div>:<div className="boardEmpty">Доска пока пуста. Самое время повесить первый квест.</div>}
        </div>
      </section>

      <section className="journeyRibbon">
        <div><span>✦</span><strong>{xp} XP</strong><small>накоплено за путь</small></div>
        <div><span>⚔</span><strong>{active.length}</strong><small>активных квестов</small></div>
        <div><span>♨</span><strong>{completedDaily}/{totalDaily}</strong><small>ритуалов сегодня</small></div>
        <div><span>▰</span><strong>{arcs?.length??0}</strong><small>активных арок</small></div>
      </section>
    </section>
  </div>
}
