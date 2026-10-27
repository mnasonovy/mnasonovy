import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) throw new Error('Not authenticated')
  return { supabase, userId }
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
  const [{data:quests},{data:branches},{data:ledger}] = await Promise.all([
    supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
    supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
    supabase.from('xp_ledger').select('amount').eq('user_id',userId),
  ])
  const xp=(ledger??[]).reduce((s,x)=>s+x.amount,0)
  const active=(quests??[]).filter(q=>q.status==='active')
  return <>
    <div className="eyebrow">Life RPG v1 · dev</div><h1 className="title">Первый настоящий вертикальный срез</h1><p className="subtitle">Аккаунт, нормализованная БД, RLS, realtime и атомарный XP уже связаны в один рабочий поток.</p>
    <section className="section grid grid3"><div className="card stat"><span className="muted">Активных квестов</span><strong>{active.length}</strong></div><div className="card stat"><span className="muted">Веток</span><strong>{branches?.length??0}</strong></div><div className="card stat"><span className="muted">XP ledger</span><strong>{xp}</strong></div></section>
    <section className="section grid grid2"><div className="card"><div className="eyebrow">Быстрый старт</div><h2>Создать ветку</h2><form className="form" action={createBranch}><div className="grid grid2"><div className="field"><label>Иконка</label><input className="input" name="icon" defaultValue="🌿"/></div><div className="field"><label>Название</label><input className="input" name="name" placeholder="Учёба" required/></div></div><button className="btn btnPrimary">Создать ветку</button></form></div><div className="card"><div className="eyebrow">Новый квест</div><h2>Добавить миссию</h2><form className="form" action={createQuest}><div className="field"><label>Название</label><input className="input" name="title" required placeholder="Закрыть 4 лабы"/></div><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="grid grid3"><input className="input" type="number" min="1" name="max" defaultValue="1" title="Цель"/><input className="input" name="unit" placeholder="лабы"/><input className="input" type="number" min="0" name="xp" defaultValue="100" title="XP"/></div><button className="btn btnPrimary">Создать квест</button></form></div></section>
    <section className="section"><h2>Квесты</h2><div className="grid">{quests?.length?quests.map(q=>{const p=Number(q.progress),max=Number(q.max_progress),pct=Math.round(p/max*100);return <article className="card quest" key={q.id}><div><div className="actions"><span className="pill">{q.status}</span>{q.branches&&<span className="pill">{q.branches.icon} {q.branches.name}</span>}</div><h3>{q.title}</h3><div className="progress"><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="muted">{p}/{max} {q.unit} · {q.xp_reward} XP</div></div><div className="actions">{q.status==='completed'?<form action={reopen.bind(null,q.id)}><button className="btn">Вернуть</button></form>:<>{max>1&&<><form action={setProgress.bind(null,q.id,Math.max(0,p-1))}><button className="btn">−1</button></form><form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="btn">+1</button></form></>}<form action={complete.bind(null,q.id)}><button className="btn btnPrimary">Готово</button></form></>}</div></article>}):<div className="card muted">Создай первую ветку и квест.</div>}</div></section>
  </>
}
