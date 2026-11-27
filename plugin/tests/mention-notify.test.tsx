// 멘션 알림은 「Claude 알림」 앱으로, 누르면 그 세션이 열리는 주소와 함께(2026-11-27).
import { expect, test } from 'claude-code/testing'
import { band, world, within } from './support/world'

const people = [
  { id: 'host', name: 'scott', role: 'host', online: true },
  { id: 'seat2', name: 'Alex', role: 'guest', online: true },
]
const chat = (seq: number, text: string) => ({
  seq,
  events: [{ seq, type: 'chat', ts: 1_000, from: { seat: 'seat2', name: 'Alex', role: 'guest' }, body: { text } }],
  people,
  ended: false,
  title: 'demo',
})

async function mentioned($: any, on: any, env: Record<string, string>) {
  on('turn.complete', () => ({ text: '' }))
  on('prompt.suggest', () => ({ isShown: true }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages, env })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(chat(2, '@scott 이거 봐 주세요'))
  const notes = () => asked.spawned.filter(s => s.input?.includes('claude-notify'))
  await within(asked.clock, () => notes().length > 0, 5_000)
  pages.length = 0
  const bounce = asked.spawned.find(s => s.input?.includes('dock-bounce.jxa.js'))
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
  return { script: notes()[0]?.input ?? '', bounce: bounce?.input ?? '' }
}

test('데스크톱 세션에서 멘션되면 알림을 누를 때 그 세션이 열린다', async ($, on) => {
  const { script, bounce } = await mentioned($, on, { CLAUDE_CODE_HOST_SESSION_ID: 'local_0123abcd-4567' })
  expect(script).toContain("'--open' 'claude://code/continue?session=local_0123abcd-4567'")
  expect(script).toContain("'--title' 'Alex 님이 멘션했습니다'")
  // 기다리지 않는다: 앱은 누르기를 받으려고 30초 남아 있다.
  expect(script).toMatch(/\) <\/dev\/null >\/dev\/null 2>&1 &/)
  expect(bounce).toContain("'claude://code/continue?session=local_0123abcd-4567'")
})

test('세션 이름이 이상하면 주소를 붙이지 않는다', async ($, on) => {
  const { script } = await mentioned($, on, { CLAUDE_CODE_HOST_SESSION_ID: "local_x'; rm -rf ~" })
  expect(script).not.toContain('--open')
  expect(script).toContain('claude-notify')
})

test('다시 연결하며 따라잡은 지난 멘션은 맥 알림 · 독 없이 토스트만', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  on('prompt.suggest', () => ({ isShown: true }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages, env: { CLAUDE_CODE_HOST_SESSION_ID: 'local_0123abcd' } })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  await asked.clock.advance(10 * 60_000)
  pages.push(chat(2, '@scott 아까 그거요'))
  await within(asked.clock, () => asked.toasted.some(t => t.startsWith('Alex mentioned you')), 5_000)
  pages.length = 0
  await asked.clock.advance(500)
  expect(asked.spawned.filter(s => s.input?.includes('claude-notify') || s.input?.includes('dock-bounce'))).toHaveLength(0)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test('한국어로 불러도(@scott님) 알림이 간다', async ($, on) => {
  const pages: unknown[] = []
  on('turn.complete', () => ({ text: '' }))
  on('prompt.suggest', () => ({ isShown: true }))
  const asked = world(on, { surfaces: ['desktop'], stream: pages, env: { CLAUDE_CODE_HOST_SESSION_ID: 'local_0123abcd' } })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(chat(2, '@scott님 확인 부탁드립니다'))
  expect(await within(asked.clock, () => asked.spawned.some(s => s.input?.includes('claude-notify')), 5_000)).toBe(true)
  pages.length = 0
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})
