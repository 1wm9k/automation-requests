import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import './index.css'

export type Ticket = {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  status: string
  created_at: string
  updated_at: string
}

const cats = ['Бот', 'Интеграция', 'Отчёт', 'Другое']
const statuses = ['Новая', 'В работе', 'Завершена']

const fmt = (s: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(s))

const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&')

function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitted = useRef(false)

  function changeMode(nextMode: 'login' | 'signup') {
    setMode(nextMode)
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitted.current || busy) return
    setError('')

    const em = email.replace(/[\u200B\uFEFF\r]/g, '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
      setError('Введите корректный email')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    submitted.current = true
    setBusy(true)

    try {
      const res =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: em, password })
          : await supabase.auth.signUp({ email: em, password })

      setBusy(false)
      submitted.current = false

      if (res.error) {
        const m = res.error.message.toLowerCase()
        if (m.includes('already registered')) {
          setError('Этот email уже зарегистрирован')
        } else if (mode === 'login' && (m.includes('invalid login') || m.includes('credentials'))) {
          setError('Неверный email или пароль')
        } else if (m.includes('fetch') || m.includes('network')) {
          setError('Ошибка сети. Проверьте соединение и попробуйте снова')
        } else {
          setError(res.error.message)
        }
        return
      }

      if (mode === 'signup' && !res.data.session) {
        setError('Проверьте почту для подтверждения регистрации')
        return
      }

      onDone()
    } catch {
      setBusy(false)
      submitted.current = false
      setError('Не удалось выполнить запрос. Проверьте соединение')
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <div className="brand">
          <span className="logo">⚙</span>
          <div>
            <h1>Заявки на автоматизацию</h1>
            <p>Рабочее пространство команды</p>
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => changeMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => changeMode('signup')}
          >
            Регистрация
          </button>
        </div>

        <label>
          Email
          <input
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            autoFocus
          />
        </label>

        <label>
          Пароль
          <div className="password">
            <input
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => setShow(!show)}
            >
              {show ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </label>

        {error && <div className="error">{error}</div>}

        <button className="primary full" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Все')
  const [modal, setModal] = useState<{ ticket?: Ticket } | null>(null)
  const [toast, setToast] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const request = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setTickets([])
      setQuery('')
      setStatus('Все')
      if (s) setToast('')
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    const id = ++request.current
    setListLoading(true)

    let q = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    const term = query.trim()
    if (term) q = q.ilike('title', `%${escapeLike(term)}%`)
    if (status !== 'Все') q = q.eq('status', status)

    const { data, error } = await q
    if (id !== request.current) return
    setListLoading(false)

    if (error) {
      if (error.code === '401' || /jwt/i.test(error.message)) {
        await supabase.auth.signOut()
        setToast('Сессия истекла, войдите снова')
      } else {
        setToast('Не удалось загрузить заявки')
      }
    } else {
      setTickets(data || [])
    }
  }, [query, status])

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => load(), 300)
    return () => clearTimeout(timer)
  }, [session, load])

  async function signOut() {
    await supabase.auth.signOut()
    setTickets([])
    setQuery('')
    setStatus('Все')
    setToast('Вы вышли из аккаунта')
  }

  async function changeStatus(t: Ticket, s: string) {
    if (updatingStatusId === t.id) return
    setUpdatingStatusId(t.id)

    const { data, error } = await supabase
      .from('tickets')
      .update({ status: s })
      .eq('id', t.id)
      .select()

    setUpdatingStatusId(null)

    if (error || !data || data.length === 0) {
      setToast('Не удалось обновить статус')
    } else {
      setTickets((x) => x.map((a) => (a.id === t.id ? { ...a, status: s } : a)))
      setToast('Статус обновлён')
    }
  }

  if (loading) return <div className="center">Загрузка…</div>

  if (!session) {
    return (
      <>
        <Auth onDone={() => {}} />
        {toast && (
          <div className="toast" onAnimationEnd={() => setToast('')}>
            {toast}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="brand compact">
          <span className="logo">⚙</span>
          <div>
            <h1>Заявки на автоматизацию</h1>
            <p>Ваш рабочий список</p>
          </div>
        </div>
        <div className="user">
          <span>{session.user.email}</span>
          <button className="ghost" onClick={signOut}>
            Выйти
          </button>
        </div>
      </header>

      <main>
        <div className="toolbar">
          <div className="search">
            <span>⌕</span>
            <input
              placeholder="Поиск по названию"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Все</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <button className="primary" onClick={() => setModal({})}>
            ＋ Новая заявка
          </button>
        </div>

        {listLoading ? (
          <div className="card empty">Загрузка заявок…</div>
        ) : tickets.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon">✦</div>
            <h2>
              {query || status !== 'Все'
                ? 'Ничего не найдено'
                : 'У вас пока нет заявок'}
            </h2>
            <p>
              {query || status !== 'Все'
                ? 'Измените запрос или сбросьте фильтры.'
                : 'Создайте первую заявку на автоматизацию.'}
            </p>
            <button
              className="primary"
              onClick={() => {
                if (query || status !== 'Все') {
                  setQuery('')
                  setStatus('Все')
                } else {
                  setModal({})
                }
              }}
            >
              {query || status !== 'Все' ? 'Сбросить фильтры' : 'Создать заявку'}
            </button>
          </div>
        ) : (
          <div className="tickets">
            {tickets.map((t) => (
              <article
                className="card ticket"
                key={t.id}
                onClick={() => setModal({ ticket: t })}
              >
                <div className="ticket-main">
                  <div className="ticket-title">{t.title}</div>
                  <div className="ticket-desc">{t.description}</div>
                </div>
                <div className="meta">
                  <span className="badge category">{t.category}</span>
                  <span className="date">{fmt(t.created_at)}</span>
                  <select
                    className={`status ${
                      t.status === 'Завершена'
                        ? 'done'
                        : t.status === 'В работе'
                        ? 'progress'
                        : ''
                    }`}
                    value={t.status}
                    disabled={updatingStatusId === t.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => changeStatus(t, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <Editor
          ticket={modal.ticket}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            setModal(null)
            setToast(msg)
            load()
          }}
        />
      )}

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  )
}

function Editor({
  ticket,
  onClose,
  onSaved,
}: {
  ticket?: Ticket
  onClose: () => void
  onSaved: (m: string) => void
}) {
  const [title, setTitle] = useState(ticket?.title || '')
  const [description, setDescription] = useState(ticket?.description || '')
  const [category, setCategory] = useState(ticket?.category || cats[0])
  const [status, setStatus] = useState(ticket?.status || statuses[0])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const id = useRef(ticket?.id || crypto.randomUUID())
  const saveRef = useRef(false)

  // Esc keyboard shortcut to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saveRef.current || busy) return
    setFormError('')

    const t = title.trim()
    const d = description.trim()

    if (!t) {
      setFormError('Заполните название заявки')
      return
    }
    if (t.length > 200) {
      setFormError('Название не должно превышать 200 символов')
      return
    }
    if (!d) {
      setFormError('Заполните описание задачи')
      return
    }
    if (d.length > 5000) {
      setFormError('Описание не должно превышать 5000 символов')
      return
    }

    saveRef.current = true
    setBusy(true)

    try {
      if (ticket) {
        const { data, error } = await supabase
          .from('tickets')
          .update({ title: t, description: d, category, status })
          .eq('id', ticket.id)
          .select()

        setBusy(false)
        saveRef.current = false

        if (error) {
          if (error.code === 'PGRST116') {
            onSaved('Заявка не найдена или была удалена')
            return
          }
          setFormError('Не удалось сохранить. Проверьте соединение и попробуйте ещё раз')
          return
        }

        if (!data || data.length === 0) {
          onSaved('Заявка не найдена или была удалена')
          return
        }

        onSaved('Изменения сохранены')
      } else {
        const { error } = await supabase
          .from('tickets')
          .insert({
            id: id.current,
            title: t,
            description: d,
            category,
          })
          .select()
          .single()

        setBusy(false)
        saveRef.current = false

        if (error) {
          if (error.code === '23505') {
            onSaved('Заявка уже сохранена')
            return
          }
          setFormError('Не удалось сохранить. Проверьте соединение и попробуйте ещё раз')
          return
        }

        onSaved('Заявка создана')
      }
    } catch {
      setBusy(false)
      saveRef.current = false
      setFormError('Не удалось сохранить. Проверьте соединение и попробуйте ещё раз')
    }
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <form className="modal card" onSubmit={save}>
        <div className="modal-head">
          <h2>{ticket ? 'Редактировать заявку' : 'Новая заявка'}</h2>
          <button
            type="button"
            className="icon-btn"
            disabled={busy}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {formError && (
          <div className="error" style={{ marginBottom: 14 }}>
            {formError}
          </div>
        )}

        <label>
          Название
          <input
            maxLength={200}
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <small>{title.length}/200</small>
        </label>

        <label>
          Описание задачи
          <textarea
            maxLength={5000}
            rows={6}
            value={description}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
          />
          <small>{description.length}/5000</small>
        </label>

        <label>
          Категория
          <select
            value={category}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        {ticket && (
          <label>
            Статус
            <select
              value={status}
              disabled={busy}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <div className="actions">
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default App
