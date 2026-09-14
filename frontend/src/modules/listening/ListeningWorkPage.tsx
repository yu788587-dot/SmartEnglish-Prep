import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Select, Spin, Typography } from 'antd'
import { ArrowLeftOutlined, CaretRightOutlined, PauseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import './listening.css'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function fmt(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ListeningWorkPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()

  const material = useLiveQuery(() => db.listeningMaterials.get(id), [id])

  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [cueStarts, setCueStarts] = useState<Record<number, number>>({})

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loopRef = useRef<{ a: number | null; b: number | null }>({ a: null, b: null })
  loopRef.current = { a: loopA, b: loopB }
  const mountedAt = useMemo(() => new Date().toISOString(), [])

  // 音频 Blob → object URL;卸载时回收
  useEffect(() => {
    if (!material?.audioBlob) return
    const url = URL.createObjectURL(material.audioBlob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [material?.audioBlob])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = speed
  }, [speed])

  // 未离开即记录精听时长
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - new Date(mountedAt).getTime()) / 1000)
      if (duration >= 5) {
        void db.studySessions.put({
          id: newId(),
          userId: LOCAL_USER_ID,
          module: 'listening',
          startAt: mountedAt,
          durationS: duration,
        })
      }
    }
  }, [mountedAt])

  // 字幕:SRT 有 end;纯文本行由 cueStarts(播放中钉入)补起点,end = 下一句起点
  const cues = useMemo(() => {
    if (!material) return []
    return material.cues
      .map((c, i) => ({ ...c, index: i }))
      .map((c) => {
        const start = c.start ?? cueStarts[c.index] ?? null
        return { ...c, start }
      })
      .sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))
      .map((c, i, arr) => ({
        ...c,
        end: c.end ?? arr[i + 1]?.start ?? null,
      }))
  }, [material, cueStarts])

  const activeIdx = useMemo(() => {
    let idx = -1
    cues.forEach((c, i) => {
      if (c.start !== null && c.start <= time) idx = i
    })
    return idx
  }, [cues, time])

  function seek(t: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, t)
    setTime(audio.currentTime)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => messageAuto())
    else audio.pause()
  }

  function messageAuto() {
    // 自动播放被浏览器策略拦截时,静默回落:用户点一次播放即可
  }

  function sentenceLoop() {
    const cur = cues[activeIdx]
    if (!cur || cur.start === null) return
    const end = cur.end ?? cur.start + 5
    setLoopA(cur.start)
    setLoopB(end)
    seek(cur.start)
    void audioRef.current?.play().catch(() => undefined)
  }

  function pinStart(index: number) {
    setCueStarts((prev) => ({ ...prev, [index]: time }))
  }

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    const t = audio.currentTime
    setTime(t)
    const { a, b } = loopRef.current
    if (a !== null && b !== null && t >= b) {
      audio.currentTime = a
      setTime(a)
    }
  }

  if (!material) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  const currentCue = activeIdx >= 0 ? cues[activeIdx] : null
  const prevCue = activeIdx > 0 ? cues[activeIdx - 1] : null
  const nextCue = activeIdx >= 0 && activeIdx < cues.length - 1 ? cues[activeIdx + 1] : cues[0] ?? null

  return (
    <div className="listen-work">
      <header className="listen-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/listening')}>
          {t('listening.work.back')}
        </Button>
        <h1 className="listen-title">{material.title}</h1>
        <span className="listen-time">
          {fmt(time)} / {duration ? fmt(duration) : '--:--'}
        </span>
      </header>

      <div className="listen-now">
        {currentCue ? (
          <>
            <p className="listen-now-prev">{prevCue?.text ?? ''}</p>
            <p className="listen-now-main">{currentCue.text}</p>
            <p className="listen-now-next">{nextCue?.text ?? ''}</p>
          </>
        ) : (
          <p className="listen-now-hint">{t('listening.work.pressPlay')}</p>
        )}
      </div>

      <div className="listen-controls">
        <Button
          type="primary"
          icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={togglePlay}
          aria-label="play"
        />
        <Select
          value={speed}
          onChange={setSpeed}
          size="small"
          style={{ width: 92 }}
          options={SPEEDS.map((s) => ({ value: s, label: `×${s}` }))}
        />
        <Button size="small" onClick={() => seek(time - 5)}>
          −5s
        </Button>
        <Button size="small" onClick={() => seek(time + 5)}>
          +5s
        </Button>
        <span className="listen-divider" aria-hidden />
        <Button
          size="small"
          onClick={() => prevCue && prevCue.start !== null && seek(prevCue.start)}
          disabled={activeIdx <= 0}
        >
          {t('listening.work.prevSentence')}
        </Button>
        <Button
          size="small"
          onClick={() => nextCue && nextCue.start !== null && seek(nextCue.start)}
          disabled={!nextCue}
        >
          {t('listening.work.nextSentence')}
        </Button>
        <span className="listen-divider" aria-hidden />
        <Button size="small" onClick={() => setLoopA(time)}>
          {t('listening.work.setA')}
        </Button>
        <Button size="small" onClick={() => setLoopB(time)}>
          {t('listening.work.setB')}
        </Button>
        <Button size="small" onClick={sentenceLoop}>
          {t('listening.work.loopSentence')}
        </Button>
        {(loopA !== null || loopB !== null) && (
          <Button
            size="small"
            onClick={() => {
              setLoopA(null)
              setLoopB(null)
            }}
          >
            {t('listening.work.clearLoop')} ({loopA !== null ? fmt(loopA) : '·'}–
            {loopB !== null ? fmt(loopB) : '·'})
          </Button>
        )}
      </div>

      <audio
        ref={audioRef}
        src={objectUrl ?? undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <div className="listen-body">
        <aside className="listen-cues">
          <div className="section-label">{t('listening.work.cueList')}</div>
          {cues.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`listen-cue${i === activeIdx ? ' is-active' : ''}`}
              onClick={() => c.start !== null && seek(c.start)}
            >
              <span className="listen-cue-time">
                {c.start !== null ? fmt(c.start) : t('listening.work.unpinned')}
              </span>
              <span className="listen-cue-text">{c.text}</span>
              {c.start === null && (
                <span
                  role="button"
                  tabIndex={0}
                  className="listen-cue-pin"
                  onClick={(e) => {
                    e.stopPropagation()
                    pinStart(c.index)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      pinStart(c.index)
                    }
                  }}
                >
                  {t('listening.work.pin')}
                </span>
              )}
            </button>
          ))}
        </aside>
        <Typography.Text type="secondary" className="listen-hint">
          {t('listening.work.hint')}
        </Typography.Text>
      </div>
    </div>
  )
}
