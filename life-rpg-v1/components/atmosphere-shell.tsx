'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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

const palettes: Record<Period, { sky1: string; sky2: string; sky3: string; mountain: string; distant: string; forest: string; ground: string; glow: string; water: string }> = {
  morning: { sky1: '#5c8fc5', sky2: '#f0b878', sky3: '#ffe6b2', mountain: '#72879a', distant: '#9ba990', forest: '#314f42', ground: '#183127', glow: '#ffd27e', water: '#7db4bd' },
  day: { sky1: '#397fc4', sky2: '#79b8df', sky3: '#cde6ef', mountain: '#66849a', distant: '#91ae8a', forest: '#234b38', ground: '#173223', glow: '#ffe29b', water: '#5eabb9' },
  evening: { sky1: '#263d6d', sky2: '#a9574f', sky3: '#f1a15f', mountain: '#48556d', distant: '#626b68', forest: '#1d302c', ground: '#14231f', glow: '#ff9b4d', water: '#4d7484' },
  night: { sky1: '#071429', sky2: '#102b46', sky3: '#21425c', mountain: '#233949', distant: '#304b4d', forest: '#102624', ground: '#091b19', glow: '#ff9a43', water: '#294c59' },
}

function FantasyBackdrop({ period }: { period: Period }) {
  const p = palettes[period]
  const isDark = period === 'night' || period === 'evening'
  const stars = useMemo(() => Array.from({ length: 42 }, (_, i) => ({
    cx: 35 + ((i * 97) % 1530),
    cy: 28 + ((i * 53) % 300),
    r: 0.7 + ((i * 7) % 3) * 0.45,
    delay: `${(i % 8) * .35}s`,
  })), [])
  const fireflies = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    cx: 90 + ((i * 139) % 1420),
    cy: 390 + ((i * 67) % 330),
    r: 1.8 + (i % 3) * .8,
    delay: `${(i % 6) * .55}s`,
  })), [])

  return <svg className="worldBackdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky1}/><stop offset=".56" stopColor={p.sky2}/><stop offset="1" stopColor={p.sky3}/></linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.water}/><stop offset="1" stopColor="#172d32"/></linearGradient>
      <radialGradient id="fireGlow"><stop offset="0" stopColor={p.glow} stopOpacity=".88"/><stop offset=".45" stopColor="#ef6a2e" stopOpacity=".30"/><stop offset="1" stopColor="#ef6a2e" stopOpacity="0"/></radialGradient>
      <radialGradient id="vignette"><stop offset="55%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity=".82"/></radialGradient>
      <filter id="blurGlow"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>

    <rect width="1600" height="900" fill="url(#sky)"/>
    {isDark && <g className="stars">{stars.map((s, i)=><circle key={i} className="star" {...s} fill="#fff3c4" style={{animationDelay:s.delay}}/>)}</g>}
    {period === 'morning' && <circle cx="1290" cy="170" r="66" fill="#ffe8ab" opacity=".9"/>}
    {period === 'day' && <circle cx="1300" cy="115" r="54" fill="#fff2b8" opacity=".96"/>}
    {period === 'evening' && <circle cx="1260" cy="210" r="62" fill="#ffb05e" opacity=".85"/>}
    {period === 'night' && <g><circle cx="1280" cy="145" r="56" fill="#f2e7c5"/><circle cx="1304" cy="126" r="56" fill={p.sky1}/></g>}

    <path d="M0 430 L180 270 L310 388 L470 215 L620 405 L815 255 L960 405 L1150 245 L1290 390 L1450 230 L1600 410 L1600 900 L0 900Z" fill={p.mountain} opacity=".92"/>
    <path d="M0 505 C180 430 305 470 430 420 C560 370 690 455 820 405 C960 350 1080 430 1200 390 C1370 335 1480 380 1600 360 L1600 900 L0 900Z" fill={p.distant}/>

    <g className="distantCastle" transform="translate(1110 300)">
      <path d="M0 120H235V245H0Z" fill="#1d2c31" opacity=".88"/>
      <path d="M22 120V42H62V120M93 120V8H132V120M165 120V58H201V120" fill="#263940"/>
      <path d="M17 43L42 10L67 43M87 10L112 -28L137 10M159 58L183 27L207 58" fill="#18282f"/>
      {isDark && <g fill="#ffca72"><rect x="32" y="70" width="8" height="13"/><rect x="48" y="86" width="8" height="13"/><rect x="105" y="42" width="9" height="14"/><rect x="119" y="72" width="8" height="14"/><rect x="177" y="91" width="8" height="13"/></g>}
    </g>

    <path d="M610 900 C640 740 760 650 900 620 C1005 598 1090 620 1155 657 C1040 678 970 734 955 900Z" fill="url(#water)" opacity=".88"/>
    <path d="M0 590 C170 520 315 555 475 520 C630 485 710 545 805 560 C600 604 490 670 430 900 H0Z" fill={p.forest}/>
    <path d="M1600 520 C1425 495 1310 530 1195 585 C1350 615 1440 675 1480 900 H1600Z" fill={p.forest}/>
    <path d="M0 725 C210 680 375 735 520 710 C760 670 865 740 1000 725 C1210 690 1375 720 1600 675V900H0Z" fill={p.ground}/>

    <g className="treeSilhouette" fill="#071512" opacity={period==='day'?'.62':'.88'}>
      <path d="M70 0H175L158 150L210 250L168 244L196 350L147 328L166 520H82L99 330L55 352L84 248L38 263L84 154Z"/>
      <path d="M1430 0H1540L1508 160L1575 280L1520 266L1558 410L1497 382L1518 560H1438L1450 382L1398 410L1430 265L1380 284L1446 160Z"/>
    </g>

    <ellipse className="campfireAura" cx="1110" cy="720" rx="205" ry="150" fill="url(#fireGlow)" filter="url(#blurGlow)"/>
    <g className="campfire" transform="translate(1115 730)">
      <path d="M-72 48L72 48" stroke="#5d3826" strokeWidth="20" strokeLinecap="round" transform="rotate(10)"/>
      <path d="M-72 48L72 48" stroke="#4b2d21" strokeWidth="20" strokeLinecap="round" transform="rotate(-12)"/>
      <path className="flame flameBack" d="M0 45C-43 12-31-25-2-55C-6-24 27-20 15-82C64-35 61 8 28 43Z" fill="#e65425"/>
      <path className="flame flameFront" d="M2 42C-22 17-10-7 8-30C5-7 29-1 23-43C48-10 40 21 18 43Z" fill="#ffd16b"/>
    </g>

    {(period === 'evening' || period === 'night') && <g>{fireflies.map((f,i)=><circle key={i} className="firefly" {...f} fill="#ffd66f" style={{animationDelay:f.delay}}/>)}</g>}
    <rect width="1600" height="900" fill="url(#vignette)" opacity=".22"/>
  </svg>
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
    <FantasyBackdrop period={period}/>
    <div className="atmosphereShade"/>
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
