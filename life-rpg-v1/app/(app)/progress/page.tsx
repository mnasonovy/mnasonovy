import { createClient } from '@/lib/supabase/server'
import { CollapsiblePanel } from '@/components/collapsible-panel'

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
 const level=Math.max(1,Math.floor(totalXp/500)+1)
 const levelFloor=(level-1)*500
 const levelProgress=Math.max(0,totalXp-levelFloor)
 const levelPct=Math.min(100,Math.round(levelProgress/500*100))
 const sourceLabel=(type:string)=>({quest_completion:'Квест завершён',quest_reopen:'Квест возвращён',daily_completion:'Ежедневка закрыта',daily_reopen:'Ежедневка возвращена',progression_node_completion:'Этап карты пройден'} as Record<string,string>)[type]||type||'Событие'
 const eventEmoji=(type:string)=>({quest_completion:'⚔',quest_reopen:'↩',daily_completion:'♨',daily_reopen:'↩',progression_node_completion:'✦'} as Record<string,string>)[type]||'•'
 return <>
  <header className="pageIntro"><div className="eyebrow">История персонажа</div><h1 className="title">Прогресс</h1><p className="subtitle">Здесь видно не количество галочек, а накопленный путь: опыт, завершённые истории и направления, которые ты развиваешь.</p></header>

  <section className="section progressHero">
    <div className="card xpHero"><div className="xpHeroGlow"/><div><div className="eyebrow">Уровень {level}</div><div className="xpValue">{totalXp}<span> XP</span></div><div className="xpSub">До следующего уровня — {Math.max(0,500-levelProgress)} XP</div><div className="levelTrack"><span style={{width:`${levelPct}%`}}/></div></div><div className="actions"><span className="pill">+{xp7} XP за 7 дней</span><span className="pill">{totalCompleted} завершений</span></div></div>
    <div className="metricStack"><div className="card miniMetric"><span className="metricIcon">⚔</span><span className="muted">Квесты</span><strong>{completedQuests}</strong></div><div className="card miniMetric"><span className="metricIcon">♨</span><span className="muted">Ежедневки</span><strong>{completedDaily}</strong></div><div className="card miniMetric"><span className="metricIcon">✦</span><span className="muted">Этапы карты</span><strong>{completedNodes}</strong></div></div>
  </section>

  <div className="section panelStack">
    <CollapsiblePanel title="Ветки развития" subtitle="Куда уходят твои усилия и накопленный опыт" icon="❧" meta={<span>{branches?.length??0} веток</span>}>
      <div className="branchList">{branches?.length?branches.map(branch=>{const xp=branchXp.get(branch.id)??0;const pct=Math.round(xp/maxBranchXp*100);return <div className="branchRow" key={branch.id}><div className="branchRowTop"><div><strong>{branch.icon} {branch.name}</strong>{branch.description&&<div className="muted compactText">{branch.description}</div>}</div><strong>{xp} XP</strong></div><div className="branchTrack"><span style={{width:`${pct}%`}}/></div></div>}):<div className="emptyState"><strong>Ветки ещё не созданы.</strong><span>Создай направление на карте развития — здесь появится его вклад в общий путь.</span></div>}</div>
    </CollapsiblePanel>

    <CollapsiblePanel title="Летопись опыта" subtitle="Последние события, которые изменили персонажа" icon="✧" meta={<span>{ledger?.length??0} событий</span>} defaultOpen={false}>
      {ledger?.length?<div className="eventList">{ledger.slice(0,24).map(row=><div className="eventRow" key={row.id}><div className="eventMeta"><span className="eventDot">{eventEmoji(row.source_type)}</span><div><div className="eventTitle">{sourceLabel(row.source_type)}</div><div className="eventTime">{new Date(row.created_at).toLocaleString('ru-RU')}</div></div></div><div className="eventXp">{Number(row.amount)>0?'+':''}{row.amount} XP</div></div>)}</div>:<div className="emptyState"><strong>Летопись пока пуста.</strong><span>Заверши квест, ежедневку или этап карты — первое событие появится здесь.</span></div>}
    </CollapsiblePanel>
  </div>
 </>
}
