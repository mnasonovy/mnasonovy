import { createClient } from '@/lib/supabase/server'

async function requireUser(){const supabase=await createClient();const{data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)throw new Error('Not authenticated');return{supabase,userId}}

export default async function ProgressPage(){
 const{supabase,userId}=await requireUser()
 const[{data:ledger},{data:branches},{data:quests},{data:dailyInstances},{data:nodes}]=await Promise.all([
  supabase.from('xp_ledger').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
  supabase.from('branches').select('*').eq('user_id',userId).is('archived_at',null).order('priority'),
  supabase.from('quests').select('id,status,branch_id,xp_reward,completed_at').eq('user_id',userId),
  supabase.from('daily_instances').select('id,status,completed_at').eq('user_id',userId),
  supabase.from('progression_nodes').select('id,status,xp_reward,completed_at').eq('user_id',userId),
 ])
 const totalXp=(ledger??[]).reduce((s,row)=>s+Number(row.amount),0)
 const completedQuests=(quests??[]).filter(q=>q.status==='completed').length
 const completedDaily=(dailyInstances??[]).filter(d=>d.status==='completed').length
 const completedNodes=(nodes??[]).filter(n=>n.status==='completed').length
 const branchXp=new Map<string,number>()
 for(const row of ledger??[]){if(row.branch_id)branchXp.set(row.branch_id,(branchXp.get(row.branch_id)??0)+Number(row.amount))}
 const sevenDaysAgo=Date.now()-7*24*60*60*1000
 const xp7=(ledger??[]).filter(row=>new Date(row.created_at).getTime()>=sevenDaysAgo).reduce((s,row)=>s+Number(row.amount),0)
 const sourceLabel=(type:string)=>({quest_completion:'Квест',quest_reopen:'Возврат квеста',daily_completion:'Ежедневка',daily_reopen:'Возврат ежедневки',progression_node_completion:'Узел карты'} as Record<string,string>)[type]||type||'Событие'
 return <>
  <div className="eyebrow">Статистика персонажа</div><h1 className="title">Прогресс</h1><p className="subtitle">XP считается из неизменяемого ledger событий. Здесь видно, откуда реально пришёл прогресс.</p>
  <section className="section grid grid3"><div className="card stat"><span className="muted">Всего XP</span><strong>{totalXp}</strong></div><div className="card stat"><span className="muted">XP за 7 дней</span><strong>{xp7}</strong></div><div className="card stat"><span className="muted">Завершено</span><strong>{completedQuests+completedDaily+completedNodes}</strong></div></section>
  <section className="section grid grid3"><div className="card stat"><span className="muted">Квесты</span><strong>{completedQuests}</strong></div><div className="card stat"><span className="muted">Ежедневки</span><strong>{completedDaily}</strong></div><div className="card stat"><span className="muted">Узлы карты</span><strong>{completedNodes}</strong></div></section>
  <section className="section"><div className="sectionHeading"><div><div className="eyebrow">По направлениям</div><h2>XP веток</h2></div></div><div className="grid grid2">{branches?.length?branches.map(branch=><div className="card" key={branch.id}><div className="actions"><span className="pill">{branch.icon} {branch.name}</span></div><h2>{branchXp.get(branch.id)??0} XP</h2><p className="muted">{branch.description||'Пока без описания.'}</p></div>):<div className="card muted">Ветки ещё не созданы.</div>}</div></section>
  <section className="section"><div className="sectionHeading"><div><div className="eyebrow">Аудит прогресса</div><h2>Последние XP-события</h2></div><span className="pill">{ledger?.length??0} событий</span></div><div className="grid">{ledger?.length?ledger.slice(0,30).map(row=><div className="card securityRow" key={row.id}><div><strong>{sourceLabel(row.source_type)}</strong><div className="muted">{new Date(row.created_at).toLocaleString('ru-RU')}</div></div><strong style={{fontSize:20}}>{Number(row.amount)>0?'+':''}{row.amount} XP</strong></div>):<div className="card muted">XP-событий пока нет. Заверши квест или узел карты.</div>}</div></section>
 </>
}
