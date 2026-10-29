import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CollapsiblePanel } from '@/components/collapsible-panel'
import { ModalForm } from '@/components/modal-form'

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
  const typeLabel=q.quest_type==='main'?'Главный':q.quest_type==='medium'?'Средний':'Побочный'
  return <article className="card quest questCard"><div><div className="actions"><span className="pill">{typeLabel}</span>{q.branches&&<span className="pill">{q.branches.icon} {q.branches.name}</span>}{q.status==='completed'&&<span className="pill pillGood">✓ завершён</span>}</div><h3>{q.title}</h3>{q.description&&<p className="muted compactText">{q.description}</p>}<div className="progress"><span style={{width:`${Math.min(100,pct)}%`}}/></div><div className="muted">{p}/{max} {q.unit} · {q.xp_reward} XP</div></div><div className="actions">{q.status==='completed'?<form action={reopen.bind(null,q.id)}><button className="btn">Вернуть</button></form>:<>{max>1&&<><form action={setProgress.bind(null,q.id,Math.max(0,p-1))}><button className="btn">−1</button></form><form action={setProgress.bind(null,q.id,Math.min(max,p+1))}><button className="btn">+1</button></form></>}<form action={complete.bind(null,q.id)}><button className="btn btnPrimary">Готово</button></form></>}</div></article>
}

export default async function QuestsPage(){
  const { supabase,userId }=await requireUser()
  const [{data:quests},{data:branches}]=await Promise.all([
    supabase.from('quests').select('*,branches(name,icon,color)').eq('user_id',userId).not('status','eq','archived').order('created_at',{ascending:false}),
    supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
  ])
  const active=(quests??[]).filter(q=>q.status==='active')
  const completed=(quests??[]).filter(q=>q.status==='completed')
  const mainCount=active.filter(q=>q.quest_type==='main').length

  const createForm=<form className="form" action={createQuest}>
    <div className="field"><label>Название</label><input className="input" name="title" required placeholder="Закрыть 4 лабораторные"/></div>
    <div className="field"><label>Описание</label><textarea className="input" name="description" placeholder="Зачем это важно и что должно измениться после завершения"/></div>
    <div className="grid grid2"><div className="field"><label>Ветка</label><select className="input" name="branchId"><option value="">Без ветки</option>{branches?.map(b=><option value={b.id} key={b.id}>{b.icon} {b.name}</option>)}</select></div><div className="field"><label>Тип</label><select className="input" name="type" defaultValue="side"><option value="main">Главный</option><option value="medium">Средний</option><option value="side">Побочный</option></select></div></div>
    <div className="grid grid3"><div className="field"><label>Цель</label><input className="input" type="number" min="1" name="max" defaultValue="1"/></div><div className="field"><label>Единица</label><input className="input" name="unit" placeholder="лабы"/></div><div className="field"><label>XP</label><input className="input" type="number" min="0" name="xp" defaultValue="100"/></div></div>
    <button className="btn btnPrimary">Создать квест</button>
  </form>

  return <>
    <header className="pageIntro"><div className="eyebrow">Миссии персонажа</div><h1 className="title">Квесты</h1><p className="subtitle">Разовые задачи и прогресс-квесты. Всё лишнее спрятано — перед глазами только то, что ты реально проходишь.</p></header>

    <section className="section grid grid3 journeyStats"><div className="card stat"><span className="muted">Активные</span><strong>{active.length}</strong><small>сейчас в пути</small></div><div className="card stat"><span className="muted">Главные</span><strong>{mainCount}</strong><small>ключевых миссий</small></div><div className="card stat"><span className="muted">Завершённые</span><strong>{completed.length}</strong><small>часть истории пройдена</small></div></section>

    <div className="section panelStack">
      <CollapsiblePanel title="Активные квесты" subtitle="То, что двигает историю прямо сейчас" icon="⚔" meta={<span>{active.length}</span>} action={<ModalForm triggerLabel="+ Добавить квест" title="Новый квест" eyebrow="Новая миссия">{createForm}</ModalForm>}>
        <div className="grid">{active.length?active.map(q=><QuestCard q={q} key={q.id}/>):<div className="emptyState"><strong>Путь пока свободен.</strong><span>Создай одну миссию, которую действительно хочешь продвинуть.</span></div>}</div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Завершённые" subtitle="Пройденные миссии остаются частью истории" icon="✦" meta={<span>{completed.length}</span>} defaultOpen={false}>
        <div className="grid">{completed.length?completed.map(q=><QuestCard q={q} key={q.id}/>):<div className="emptyState"><strong>История только начинается.</strong><span>Завершённые квесты появятся здесь.</span></div>}</div>
      </CollapsiblePanel>
    </div>
  </>
}
