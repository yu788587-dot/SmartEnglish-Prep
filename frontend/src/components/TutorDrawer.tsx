import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router-dom'
import { Button, Drawer, Input, Select, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  BUILT_IN_ROLES,
  buildSystemPrompt,
  getBuiltInRole,
  type TutorMessage,
} from '@/schemas/roles'
import { AiNotConfiguredError } from '@/api/ai-client'
import { gatewayChatStream } from '@/api/gateway'
import { db, LOCAL_USER_ID } from '@/db'
import i18n from '@/i18n'
import './tutor.css'

const CUSTOM_ROLES_KEY = 'customRoles'

function conversationId(roleId: string): string {
  return `tutor:${roleId}`
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function TutorDrawer({ open, onClose }: Props) {
  const { t } = useTranslation()
  const location = useLocation()
  const sceneKey = location.pathname.split('/')[1] || 'dashboard'

  const [roleId, setRoleId] = useState('default')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const customRoles = useLiveQuery(async () => {
    const row = await db.settings.get(CUSTOM_ROLES_KEY)
    if (!row) return []
    try {
      const parsed = JSON.parse(row.value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  // 会话按角色持久化:切换角色时载入
  useEffect(() => {
    if (!open) return
    void (async () => {
      const row = await db.aiConversations.get(conversationId(roleId))
      const msgs = row ? (row.messages as TutorMessage[]) : []
      setMessages(Array.isArray(msgs) ? msgs : [])
      setNotice(null)
    })()
  }, [open, roleId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, streaming])

  async function persist(msgs: TutorMessage[]) {
    await db.aiConversations.put({
      id: conversationId(roleId),
      userId: LOCAL_USER_ID,
      roleMode: roleId,
      messages: msgs,
      updatedAt: new Date().toISOString(),
    })
  }  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setNotice(null)
    const role =
      roleId === 'default' || roleId === 'strict-examiner' || roleId === 'encouraging-tutor'
        ? getBuiltInRole(roleId)
        : { id: roleId, prompt: customRolesText() }
    const system = buildSystemPrompt(role.prompt, sceneKey, i18n.language)
    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages(history)
    setBusy(true)
    setStreaming('')
    try {
      const full = await gatewayChatStream(
        [
          { role: 'system', content: system },
          ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        ],
        (delta) => setStreaming((s) => s + delta),
      )
      const done: TutorMessage[] = [...history, { role: 'assistant', content: full }]
      setMessages(done)
      setStreaming('')
      await persist(done)
    } catch (e) {
      setStreaming('')
      setNotice(
        e instanceof AiNotConfiguredError
          ? t('tutor.needConfig')
          : `${t('reading.lens.error')}: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setBusy(false)
    }
  }

  function customRolesText(): string {
    const list = (customRoles ?? []) as { id: string; name: string; prompt: string }[]
    return list.find((r) => r.id === roleId)?.prompt ?? ''
  }

  const roleOptions = [
    ...BUILT_IN_ROLES.map((r) => ({ value: r.id, label: t(`tutor.roles.${r.id}`) })),
    ...(customRoles ?? []).map((r) => ({ value: r.id, label: r.name })),
  ]

  async function clearConversation() {
    await db.aiConversations.delete(conversationId(roleId))
    setMessages([])
  }

  return (
    <Drawer
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      title={
        <span className="tutor-drawer-title">{t('tutor.title')}</span>
      }
      className="tutor-drawer"
      extra={
        <Button type="text" size="small" onClick={() => void clearConversation()}>
          {t('tutor.clear')}
        </Button>
      }
    >
      <div className="tutor-roles">
        <Select
          value={roleId}
          onChange={setRoleId}
          style={{ width: '100%' }}
          options={roleOptions}
        />
      </div>

      <div className="tutor-list" ref={listRef}>
        {messages.length === 0 && !streaming && (
          <Typography.Text type="secondary" className="tutor-empty">
            {t('tutor.empty')}
          </Typography.Text>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="tutor-msg-user" key={i}>
              {m.content}
            </div>
          ) : (
            <div className="tutor-msg-assistant" key={i}>
              {m.content}
            </div>
          ),
        )}
        {streaming && <div className="tutor-msg-assistant is-streaming">{streaming}</div>}
        {notice && (
          <Typography.Text type="secondary" className="tutor-notice">
            {notice}
          </Typography.Text>
        )}
      </div>

      <div className="tutor-input">
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('tutor.placeholder')}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <Button type="primary" loading={busy} onClick={() => void send()}>
          {t('tutor.send')}
        </Button>
      </div>
    </Drawer>
  )
}
