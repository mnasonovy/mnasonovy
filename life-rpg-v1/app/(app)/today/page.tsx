import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) throw new Error('Not authenticated')
  return { supabase, userId }
}

function localDateInZone(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

async function createBranch(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireUser()
  const name = String(formData.get('name') ?? '').trim().slice(0,80)
  if (!name) return
  const { error } = await supabase.from('branches').insert({ user_id:userId, name, icon:String(formData.get('icon') || '🌿').slice(0,8), color:'#c9825b' })
  if (error) throw error
  revalidatePath('/today')
}

async function createQuest(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireUser()
  const title = String(formData.get('title') ?? '').trim().slice(0,180)
  if (!title) return
  const max = Math.max(1, Number(formData.get('max') || 1))
  const { error } = await supabase.from('quests').insert({ user_id:userId, branch_id:String(formData.get('branchId') || '') || null, title, max_progress:max, progress:0, unit:String(formData.get('unit') || '').slice(0,24), xp_reward:Math.max(0,Number(formData.get('xp') || 100)) })
  if (error) throw error
  revalidatePath('/today')
}

async function createDailyTemplate(formData: FormData) {
  'use server'
  const { supabase } = await requireUser()
  const title = String(formData.get('title') ?? '').trim().slice(0,120)
  if (!title) return
  const branchId = String(formData.get('branchId') || '') || null
  const xp = Math.max(0, Number(formData.get('xp') || 50))
  const items = String(formData.get('items') || '')
    .split(/\r?\n/)
    .map((item) => item.trim().slice(0,180))
    .filter(Boolean)
  const { error } = await supabase.rpc('create_daily_template', {
    p_title: title,
    p_branch_id: branchId,
    p_xp_reward: xp,
    p_items: items,
  })
  if (error) throw error
  revalidatePath('/today')
}

async function disableDailyTemplate(id: string) {
  'use server'
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('daily_templates').update({ is_active: false }).eq('id', id).eq('user_id', userId)
  if (error) throw error
  revalidatePath('/today')
}

async function toggleDailyItem(id: string, completed: boolean) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('toggle_daily_item', {
    p_item_id: id,
    p_completed: completed,
    p_idempotency_key: crypto.randomUUID(),
  })
  if (error) throw error
  revalidatePath('/today')
}

async function setProgress(id:string, value:number) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('set_quest_progress',{ p_quest_id:id,p_progress:value,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today')
}

async function complete(id:string) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('complete_quest',{ p_quest_id:id,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today')
}

async function reopen(id:string) {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('reopen_quest',{ p_quest_id:id,p_idempotency_key:crypto.randomUUID() })
  if (error) throw error
  revalidatePath('/today')
}

export default async function TodayPage() {
  const { supabase, userId } = await requireUser()
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle()
  const timeZone = profile?.timezone || 'UTC'
  const localDate = localDateInZone(timeZone)

  const { error: materializeError } = await supabase.rpc('materialize_daily_instances', { p_local_date: localDate })
  if (materializeError) throw materializeError

  const [{data:quests},{data:branches},{data:ledger},{data:dailyInstances},{data:dailyTemplates}] = await Promise.all([
    supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
    supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
    supabase.from('xp_ledger').select('amount').eq('user_id',userId),
    supabase.from('daily_instances').select('*').eq('user_id',userId).eq('local_date',localDate).order('created_at'),
    supabase.from('daily_templates').select('*').eq('user_id',userId).order('created_at'),
  ])

  const dailyIds = (dailyInstances ?? []).map((instance) => instance.id)
  let dailyItems: any[] = []
  if (dailyIds.length) {
    const { data, error } = await supabase.from('daily_instance_items').select('*').eq('user_id',userId).in('instance_id', dailyIds).order('sort_order')
    if (error) throw error
    dailyItems = data ?? []
  }

  const xp=(ledger??[]).reduce((sum,row)=>sum+row.amount,0)
  const active=(quests??[]).filter(q=>q.status==='active')
  const activeDaily=(dailyTemplates??[]).filter(template=>template.is_active)
  const completedDaily=(dailyInstances??[]).filter(instance=>instance.status==='completed').length
  const branchById = new Map((branches??[]).map(branch=>[branch.id,branch]))
  const templateById = new Map((dailyTemplates??[]).map(template=>[template.id,template]))
  const itemsByInstance = new Map<string, any[]>()
  for (const item of dailyItems) {
    const current = itemsByInstance.get(item.instance_id) ?? []
    current.push(item)
    itemsByInstance.set(item.instance_id, current)
  }

  return <>
    <div className="eyebrow">Life RPG v1 · {localDate}</div>
    <h1 className="title">Сегодня</h1>
    <p className="subtitle">Ежедневные ритуалы создаются на день автоматически. Разовые задачи остаются квестами.</p>

    <section className="section grid grid3">
      <div className="card stat"><span className="muted">Активных квестов</span><strong>{active.length}</strong></div>
      <div className="card stat"><span className="muted">Ежедневки</span><strong>{completedDaily}/{dailyInstances?.length??0}</strong></div>
      <div className="card stat"><span className="muted">XP ledger</span><strong>{xp}</strong></div>
    </section>

    <section className="section">
      <div className="sectionHeading"><div><div className="eyebrow">Повторяемое</div><h2>Ежедневные квесты</h2></div><span className="pill">{timeZone}</span></div>
      <div className="grid">
        {dailyInstances?.length ? dailyInstances.map(instance=>{
          const template=templateById.get(instance.template_id)
          const items=itemsByInstance.get(instance.id)??[]
          const completed=items.filter(item=>item.is_completed).length
          const required=Math.min(template?.min_items_to_complete??items.length,items.length||1)
          const branch=template?.branch_id?branchById.get(template.branch_id):null
          return <article className={`card dailyCard ${instance.status==='completed'?'dailyDone':''}`} key={instance.id}>
            <div className="dailyHeader"><div><div className="actions"><span className="pill">{instance.status==='completed'?'✓ выполнено':'на сегодня'}</span>{branch&&<span className="pill">{branch.icon} {branch.name}</span>}</div><h3>{template?.title??'Ежедневный квест'}</h3><div className="muted">{completed}/{required} обязательных · {template?.xp_reward??0} XP</div></div></div>
            <div className="dailyItems">{items.map(item=><form action={toggleDailyItem.bind(null,item.id,!item.is_completed)} key={item.id}><button className={`dailyItem ${item.is_completed?'isDone':''}`} type="submit"><span className="dailyCheck">{item.is_completed?'✓':''}</span><span>{item.title}</span></button></form>)}</div>
          </article>
        }) : <div className="card muted">Пока нет ежедневных квестов. Создай первый шаблон ниже.</div>}
      </div>
    </section>

    <section className="section grid grid2">
      <div className="card"><div className="eyebrow">Новый ритуал</div><h2>Создать ежедневку</h2><form className="form" action={createDailyTemplate}>
        <div className="field"><label>Название</label><input className="input" name="title" placeholder="Утренний запуск" required/></div>
        <div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(branch=><option value={branch.id} key={branch.id}>{branch.icon} {branch.name}</option>)}</select></div>
        <div className="field"><label>Чек-лист — один пункт на строку</label><textarea className="input" name="items" rows={4} placeholder={'Стакан воды\nРазминка 5 минут\nСпланировать день'}/></div>
        <div className="field"><label>Награда XP</label><input className="input" type="number" min="0" max="1000000" name="xp" defaultValue="50"/></div>
        <button className="btn btnPrimary">Добавить ежедневку</button>
      </form></div>

      <div className="card"><div className="eyebrow">Активные шаблоны</div><h2>{activeDaily.length} ежедневок</h2><div className="form">{activeDaily.length?activeDaily.map(template=>{const branch=template.branch_id?branchById.get(template.branch_id):null;return <div className="securityRow" key={template.id}><div><strong>{template.title}</strong><div className="muted">{branch?`${branch.icon} ${branch.name} · `:''}{template.xp_reward} XP</div></div><form action={disableDailyTemplate.bind(null,template.id)}><button className="btn">Отключить</button></form></div>}):<p className="muted">Нет активных шаблонов.</p>}</div></div>
    </section>

    <section className="section grid grid2">
      <div className="card"><div className="eyebrow">Быстрый старт</div><h2>Создать ветку</h2><form className="form" action={createBranch}><div className="grid grid2"><div className="field"><label>Иконка</label><input className="input" name="icon" defaultValue="🌿"/></div><div className="field"><label>Название</label><input className="input" name="name" placeholder="Учёба" required/></div></div><button className="btn btnPrimary">Создать ветку</button></form></div>
      <div className="card"><div className="eyebrow">Новый квест</div><h2>Добавить миссию</h2><form className="form" action={createQuest}><div className="field"><label>Название</label><input className="input" name="title" required placeholder="Закрыть 4 лабы"/></div><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="grid grid3"><input className="input" type="number" min="1" name="max" defaultValue="1" title="Цель"/><input className="input" name="unit" placeholder="лабы"/><input className="input" type="number" min="0" name="xp" defaultValue="100" title="XP"/></div><button className="btn btnPrimary">Создать квест</button></form></div>
    </section>

    <section className="section"><h2>Разовые квесты</h2><div className="grid">{quests?.length?quests.map(q=>{const p=Number(q.progress),max=Number(q.max_progress),pct=Math.round(p/max*100);return <article className="card quest" key={q.id}><div><div className="actions"><span className="pill">{q.status}</span>{q.branches&&<span className="pill">{q.branches.icon} {q.branches.name}</span>}</div><h3>{q.title}</h3><div className="progress"><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="muted">{p}/{max} {q.unit} · {q.xp_reward} XP</div></div><div className="actions">{q.status==='completed'?<form action={reopen.bind(null,q.id)}><button className="btn">Вернуть</button></form>:<>{max>1&&<><form action={setProgress.bind(null,q.id,Math.max(0,p-1))}><button className="btn">−1</button></form><form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="btn">+1</button></form></>}<form action={complete.bind(null,q.id)}><button className="btn btnPrimary">Готово</button></form></>}</div></article>}):<div className="card muted">Создай первый квест.</div>}</div></section>
  </>
}
