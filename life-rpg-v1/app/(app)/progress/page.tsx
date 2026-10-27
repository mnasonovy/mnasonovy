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
 const totalCompleted=completedQuests+completedDaily+completedNodes
 const branchXp=new Map<string,number>()
 for(const row of ledger??[]){if(row.branch_id)branchXp.set(row.branch_id,(branchXp.get(row.branch_id)??0)+Number(row.amount))}
 const maxBranchXp=Math.max(1,...Array.from(branchXp.values()))
 const sevenDaysAgo=Date.now()-7*24*60*60*1000
 const xp7=(ledger??[]).filter(row=>new Date(row.created_at).getTime()>=sevenDaysAgo).reduce((s,row)=>s+Number(row.amount),0)
 const sourceLabel=(type:string)=>({quest_completion:'Квест завершён',quest_reopen:'Квест возвращён',daily_completion:'Ежедневка закрыта',daily_reopen:'Ежедневка возвращена',progression_node_completion:'Узел карты пройден'} as Record<string,string>)[type]||type||'Событие'
 const eventEmoji=(type:string)=>({quest_completion:'🎯',quest_reopen:'↩️',daily_completion:'☀️',daily_reopen:'↩️',progression_node_completion:'🌳'} as Record<string,string>)[type]||'•'
 return <>
  <div className="eyebrow">Статистика персонажа</div><h1 className="title">Прогресс</h1><p className="subtitle">Не журнал базы данных, а сводка того, что реально двигает персонажа вперёд.</p>

  <section className="section progressHero">
    <div className="card xpHero"><div><div className="eyebrow">Общий опыт</div><div className="xpValue">{totalXp}</div><div className="xpSub">XP накоплено за всё время</div></div><div className="actions"><span className="pill">+{xp7} XP за 7 дней</span><span className="pill">{totalCompleted} завершений</span></div></div>
    <div className="metricStack">
      <div className="card miniMetric"><span className="muted">Квесты</span><strong>{completedQuests}</strong></div>
      <div className="card miniMetric"><span className="muted">Ежедневки</span><strong>{completedDaily}</strong></div>
      <div className="card miniMetric"><span className="muted">Узлы карты</span><strong>{completedNodes}</strong></div>
    </div>
  </section>

  <section className="section"><div className="sectionHeading"><div><div className="eyebrow">Направления</div><h2>Вклад веток в XP</h2></div><span className="pill">{branches?.length??0} веток</span></div>
   <div className="branchList">{branches?.length?branches.map(branch=>{const xp=branchXp.get(branch.id)??0;const pct=Math.round(xp/maxBranchXp*100);return <div className="branchRow" key={branch.id}><div className="branchRowTop"><div><strong>{branch.icon} {branch.name}</strong>{branch.description&&<div className="muted" style={{marginTop:3}}>{branch.description}</div>}</div><strong>{xp} XP</strong></div><div className="branchTrack"><span style={{width:`${pct}%`}}/></div></div>}):<div className="card muted">Ветки ещё не созданы.</div>}</div>
  </section>

  <section className="section"><div className="sectionHeading"><div><div className="eyebrow">История</div><h2>Последние XP-события</h2></div><span className="pill">{ledger?.length??0} событий</span></div>
   {ledger?.length?<div className="eventList">{ledger.slice(0,20).map(row=><div className="eventRow" key={row.id}><div className="eventMeta"><span className="eventDot"/><div><div className="eventTitle">{eventEmoji(row.source_type)} {sourceLabel(row.source_type)}</div><div className="eventTime">{new Date(row.created_at).toLocaleString('ru-RU')}</div></div></div><div className="eventXp">{Number(row.amount)>0?'+':''}{row.amount} XP</div></div>)}</div>:<div className="card muted">XP-событий пока нет. Заверши квест, ежедневку или узел карты.</div>}
  </section>
 </>
}
