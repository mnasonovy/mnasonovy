import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) throw new Error('Not authenticated')
  return { supabase, userId }
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
  revalidatePath('/quests'); revalidatePath('/today'); revalidatePath('/progress')
}

async function setProgress(id:string,value:number){'use server';const{ supabase }=await requireUser();const{error}=await supabase.rpc('set_quest_progress',{p_quest_id:id,p_progress:value,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/quests');revalidatePath('/today');revalidatePath('/progress')}
async function complete(id:string){'use server';const{ supabase }=await requireUser();const{error}=await supabase.rpc('complete_quest',{p_quest_id:id,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/quests');revalidatePath('/today');revalidatePath('/progress')}
async function reopen(id:string){'use server';const{ supabase }=await requireUser();const{error}=await supabase.rpc('reopen_quest',{p_quest_id:id,p_idempotency_key:crypto.randomUUID()});if(error)throw error;revalidatePath('/quests');revalidatePath('/today');revalidatePath('/progress')}

function QuestCard({q}:{q:any}){
  const p=Number(q.progress),max=Math.max(1,Number(q.max_progress)),pct=Math.round(p/max*100)
  return <article className="card quest"><div><div className="actions"><span className="pill">{q.quest_type}</span><span className="pill">{q.status}</span>{q.branches&&<span className="pill">{q.branches.icon} {q.branches.name}</span>}</div><h3>{q.title}</h3>{q.description&&<p className="muted">{q.description}</p>}<div className="progress"><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="muted">{p}/{max} {q.unit} · {q.xp_reward} XP</div></div><div className="actions">{q.status==='completed'?<form action={reopen.bind(null,q.id)}><button className="btn">Вернуть</button></form>:<>{max>1&&<><form action={setProgress.bind(null,q.id,Math.max(0,p-1))}><button className="btn">−1</button></form><form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="btn">+1</button></form></>}<form action={complete.bind(null,q.id)}><button className="btn btnPrimary">Готово</button></form></>}</div></article>
}

export default async function QuestsPage(){
  const { supabase,userId }=await requireUser()
  const [{data:quests},{data:branches}]=await Promise.all([
    supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
    supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
  ])
  const active=(quests??[]).filter(q=>q.status==='active')
  const completed=(quests??[]).filter(q=>q.status==='completed')
  return <>
    <div className="eyebrow">Миссии персонажа</div><h1 className="title">Квесты</h1><p className="subtitle">Здесь живут разовые задачи и прогресс-квесты. Ежедневки остаются на экране «Сегодня».</p>
    <section className="section grid grid3"><div className="card stat"><span className="muted">Активные</span><strong>{active.length}</strong></div><div className="card stat"><span className="muted">Завершённые</span><strong>{completed.length}</strong></div><div className="card stat"><span className="muted">Всего</span><strong>{quests?.length??0}</strong></div></section>
    <section className="section grid grid2"><div className="card"><div className="eyebrow">Новая миссия</div><h2>Создать квест</h2><form className="form" action={createQuest}><div className="field"><label>Название</label><input className="input" name="title" required placeholder="Закрыть 4 лабораторные"/></div><div className="field"><label>Описание</label><textarea className="input" name="description" rows={3}/></div><div className="grid grid2"><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Тип</label><select className="input" name="type" defaultValue="side"><option value="main">Главный</option><option value="medium">Средний</option><option value="side">Побочный</option></select></div></div><div className="grid grid3"><input className="input" type="number" min="1" name="max" defaultValue="1" title="Цель"/><input className="input" name="unit" placeholder="лабы"/><input className="input" type="number" min="0" name="xp" defaultValue="100" title="XP"/></div><button className="btn btnPrimary">Создать</button></form></div><div className="card"><div className="eyebrow">Логика</div><h2>Как использовать</h2><p className="muted">Квест на 1 шаг закрывается кнопкой «Готово». Для задач вроде «4 лабы» ставь цель 4 и отмечай прогресс через +1/−1. XP начисляется только при завершении и хранится в ledger.</p></div></section>
    <section className="section"><div className="sectionHeading"><div><div className="eyebrow">В работе</div><h2>Активные квесты</h2></div><span className="pill">{active.length}</span></div><div className="grid">{active.length?active.map(q=><QuestCard q={q} key={q.id}/>):<div className="card muted">Активных квестов нет.</div>}</div></section>
    <section className="section"><div className="sectionHeading"><div><div className="eyebrow">История</div><h2>Завершённые</h2></div><span className="pill">{completed.length}</span></div><div className="grid">{completed.length?completed.map(q=><QuestCard q={q} key={q.id}/>):<div className="card muted">Завершённых квестов пока нет.</div>}</div></section>
  </>
}
