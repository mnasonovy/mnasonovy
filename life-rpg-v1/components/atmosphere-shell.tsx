'use client'

import { useEffect, useRef, useState } from 'react'

type Period = 'morning' | 'day' | 'evening' | 'night'

const periods: Array<{ id: Period; label: string; icon: string }> = [
  { id: 'morning', label: 'Утро', icon: '🌅' },
  { id: 'day', label: 'День', icon: '☀️' },
  { id: 'evening', label: 'Вечер', icon: '🌇' },
  { id: 'night', label: 'Ночь', icon: '🌙' },
]

function periodForHour(hour: number): Period {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'day'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

export function AtmosphereShell({ children, displayName }: { children: React.ReactNode; displayName?: string }) {
  const [now, setNow] = useState(() => new Date())
  const [override, setOverride] = useState<Period | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [admire, setAdmire] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const beginAdmire = () => setAdmire(true)
    window.addEventListener('emberive:admire', beginAdmire)
    return () => window.removeEventListener('emberive:admire', beginAdmire)
  }, [])

  useEffect(() => () => {
    audioRef.current?.close().catch(() => undefined)
  }, [])

  const autoPeriod = periodForHour(now.getHours())
  const period = override ?? autoPeriod
  const greeting = period === 'morning' ? 'Доброе утро' : period === 'day' ? 'Хорошего дня' : period === 'evening' ? 'Хорошего вечера' : 'Доброй ночи'
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })

  useEffect(() => {
    document.documentElement.dataset.period = period
  }, [period])

  async function toggleAtmosphere() {
    if (soundEnabled) {
      setSoundEnabled(false)
      await audioRef.current?.close().catch(() => undefined)
      audioRef.current = null
      return
    }

    const audio = new AudioContext()
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = last * .985 + white * .015
      data[i] = last * 3.2
    }
    const source = audio.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = period === 'night' ? 720 : 980
    const gain = audio.createGain()
    gain.gain.value = .035
    source.connect(filter).connect(gain).connect(audio.destination)
    source.start()
    await audio.resume()
    audioRef.current = audio
    setSoundEnabled(true)
  }

  return <div className={`atmosphere atmosphere-${period} ${admire ? 'is-admiring' : ''}`}>
    <div className="referenceBackdrop" aria-hidden="true" />
    <div className="referenceVignette" aria-hidden="true" />
    <div className="ambientBar">
      <div className="ambientGreeting">
        <span className="ambientOrb">{periods.find(p=>p.id===period)?.icon}</span>
        <div><strong>{greeting}{displayName ? `, ${displayName}` : ''}</strong><span>{time} · {date}</span></div>
      </div>
      <div className="ambientControls">
        <button className={`atmosphereSound ${soundEnabled ? 'isActive' : ''}`} type="button" onClick={toggleAtmosphere} title="Звуки атмосферы"><span>{soundEnabled ? '♫' : '♪'}</span><em>Атмосфера</em></button>
        <div className="timeSwitcher" aria-label="Предпросмотр времени суток">
          {periods.map(item=><button key={item.id} type="button" className={period===item.id?'isActive':''} onClick={()=>setOverride(item.id)} title={item.label}><span>{item.icon}</span><em>{item.label}</em></button>)}
          <button type="button" className={override===null?'isAuto':''} onClick={()=>setOverride(null)} title="Автоматически по времени устройства"><span>◌</span><em>Авто</em></button>
        </div>
      </div>
    </div>
    <div className="appWorld">{children}</div>
    {admire && <button type="button" className="admireExitLayer" onClick={()=>setAdmire(false)} aria-label="Вернуться к интерфейсу"><span>Нажми в любое место, чтобы вернуться</span></button>}
  </div>
}
