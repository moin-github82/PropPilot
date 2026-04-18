'use client'

import { useState, useEffect } from 'react'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceTask {
  id:          string
  title:       string
  category:    string
  frequency:   string   // 'annual' | '6-monthly' | '5-yearly' | 'one-off'
  lastDone:    string   // ISO date string or ''
  notes:       string
  completed:   boolean
}

// ─── Default tasks ────────────────────────────────────────────────────────────

const DEFAULT_TASKS: Omit<MaintenanceTask, 'id' | 'lastDone' | 'completed' | 'notes'>[] = [
  { title: 'Boiler service',                   category: 'Heating',    frequency: 'annual'    },
  { title: 'Gas safety check',                 category: 'Safety',     frequency: 'annual'    },
  { title: 'Smoke & CO alarm test',            category: 'Safety',     frequency: '6-monthly' },
  { title: 'Gutter clean',                     category: 'Exterior',   frequency: 'annual'    },
  { title: 'Bleed radiators',                  category: 'Heating',    frequency: 'annual'    },
  { title: 'Check roof tiles / flashings',     category: 'Exterior',   frequency: 'annual'    },
  { title: 'Electrical installation check (EICR)', category: 'Safety', frequency: '5-yearly'  },
  { title: 'Check/re-seal windows & doors',    category: 'Exterior',   frequency: 'annual'    },
  { title: 'Test water pressure',              category: 'Plumbing',   frequency: 'annual'    },
  { title: 'Check loft insulation',            category: 'Insulation', frequency: '5-yearly'  },
  { title: 'Service fire extinguisher',        category: 'Safety',     frequency: 'annual'    },
  { title: 'Check damp / mould spots',         category: 'Structure',  frequency: '6-monthly' },
]

const CATEGORIES = ['All', 'Heating', 'Safety', 'Exterior', 'Plumbing', 'Insulation', 'Structure']

function newTask(partial: Omit<MaintenanceTask, 'id' | 'lastDone' | 'completed' | 'notes'>): MaintenanceTask {
  return { ...partial, id: crypto.randomUUID(), lastDone: '', completed: false, notes: '' }
}

function daysUntilDue(task: MaintenanceTask): number | null {
  if (!task.lastDone) return null
  const last = new Date(task.lastDone)
  const freqDays: Record<string, number> = {
    'annual': 365, '6-monthly': 182, '5-yearly': 1825, 'one-off': Infinity,
  }
  const days = freqDays[task.frequency] ?? 365
  if (days === Infinity) return null
  const due = new Date(last.getTime() + days * 86400000)
  return Math.round((due.getTime() - Date.now()) / 86400000)
}

function dueBadge(days: number | null, frequency: string) {
  if (frequency === 'one-off') return null
  if (days === null) return { label: 'Not yet logged', bg: '#f8f7f4', color: '#9e998f', border: '#e2ddd6' }
  if (days < 0)   return { label: `Overdue by ${Math.abs(days)}d`, bg: '#fff1f2', color: '#9f1239',   border: '#fda4af' }
  if (days < 60)  return { label: `Due in ${days}d`,               bg: '#fffbeb', color: '#451a03',   border: '#fcd34d' }
  return              { label: `Due in ${days}d`,               bg: '#f0fdf4', color: '#14532d',   border: '#86efac' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [tasks,       setTasks]       = useState<MaintenanceTask[]>([])
  const [filter,      setFilter]      = useState('All')
  const [showAdd,     setShowAdd]     = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newCategory, setNewCategory] = useState('Safety')
  const [newFreq,     setNewFreq]     = useState('annual')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('proppilot-maintenance')
      if (saved) {
        setTasks(JSON.parse(saved))
      } else {
        const defaults = DEFAULT_TASKS.map(newTask)
        setTasks(defaults)
        localStorage.setItem('proppilot-maintenance', JSON.stringify(defaults))
      }
    } catch {
      setTasks(DEFAULT_TASKS.map(newTask))
    }
  }, [])

  const save = (updated: MaintenanceTask[]) => {
    setTasks(updated)
    try { localStorage.setItem('proppilot-maintenance', JSON.stringify(updated)) } catch {}
  }

  const markDone = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, lastDone: new Date().toISOString().split('T')[0] } : t))
  }

  const addTask = () => {
    if (!newTitle.trim()) return
    const t = newTask({ title: newTitle.trim(), category: newCategory, frequency: newFreq })
    save([...tasks, t])
    setNewTitle(''); setShowAdd(false)
  }

  const deleteTask = (id: string) => save(tasks.filter(t => t.id !== id))

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.category === filter)
  const overdue  = tasks.filter(t => { const d = daysUntilDue(t); return d !== null && d < 0 }).length
  const dueSoon  = tasks.filter(t => { const d = daysUntilDue(t); return d !== null && d >= 0 && d < 60 }).length

  const inputStyle: React.CSSProperties = {
    height: 40, padding: '0 12px', fontSize: 14, border: '1.5px solid #e2ddd6',
    borderRadius: 8, background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <SiteNav />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Home maintenance</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 500, color: '#1a1917', margin: 0 }}>Maintenance Calendar</h1>
          </div>
          <button onClick={() => setShowAdd(x => !x)} style={{ height: 40, padding: '0 16px', fontSize: 13, fontWeight: 500, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add task
          </button>
        </div>

        {/* Summary strip */}
        {(overdue > 0 || dueSoon > 0) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {overdue > 0 && (
              <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 8, padding: '10px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#9f1239', margin: 0 }}>{overdue} overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#451a03', margin: 0 }}>{dueSoon} due within 60 days</p>
              </div>
            )}
          </div>
        )}

        {/* Add task form */}
        {showAdd && (
          <div style={{ background: '#fff', border: '1px solid #1D9E75', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: '0 0 14px' }}>New task</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginBottom: 10 }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task name" style={{ ...inputStyle, width: '100%' }} onKeyDown={e => e.key === 'Enter' && addTask()} />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inputStyle, paddingRight: 8 }}>
                {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={newFreq} onChange={e => setNewFreq(e.target.value)} style={{ ...inputStyle, paddingRight: 8 }}>
                <option value="6-monthly">6-monthly</option>
                <option value="annual">Annual</option>
                <option value="5-yearly">5-yearly</option>
                <option value="one-off">One-off</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addTask} style={{ height: 36, padding: '0 16px', fontSize: 13, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{ height: 36, padding: '0 16px', fontSize: 13, background: '#f8f7f4', color: '#5e5a52', border: '1px solid #e2ddd6', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 500, background: filter === cat ? '#1D9E75' : '#fff', color: filter === cat ? '#fff' : '#5e5a52', border: `1px solid ${filter === cat ? '#1D9E75' : '#e2ddd6'}`, borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(task => {
            const days  = daysUntilDue(task)
            const badge = dueBadge(days, task.frequency)
            return (
              <div key={task.id} style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: 0 }}>{task.title}</p>
                    <span style={{ fontSize: 11, background: '#f8f7f4', color: '#9e998f', borderRadius: 20, padding: '1px 8px', border: '1px solid #e2ddd6' }}>{task.category}</span>
                    <span style={{ fontSize: 11, color: '#9e998f' }}>{task.frequency}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {badge && (
                      <span style={{ fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: '2px 8px' }}>
                        {badge.label}
                      </span>
                    )}
                    {task.lastDone && (
                      <span style={{ fontSize: 11, color: '#9e998f' }}>Last done: {new Date(task.lastDone).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => markDone(task.id)} style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500, background: '#f0fdf4', color: '#14532d', border: '1px solid #86efac', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    ✓ Done
                  </button>
                  <button onClick={() => deleteTask(task.id)} style={{ width: 32, height: 32, fontSize: 14, background: '#fff', color: '#9e998f', border: '1px solid #e2ddd6', borderRadius: 8, cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9e998f' }}>
              <p style={{ fontSize: 14, margin: 0 }}>No tasks in this category.</p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#9e998f', marginTop: 24, lineHeight: 1.6 }}>
          Tasks are saved in your browser. For reminders across devices, join the PropPilot waitlist.
        </p>
      </main>
      <Footer />
    </div>
  )
}