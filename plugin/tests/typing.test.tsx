// Someone writing in the room is shown to everyone else for a few seconds, and what this person writes says so too.
import { expect, test } from 'claude-code/testing'
import { band, PANE, world, within } from './support/world'

const people = [
  { id: 'host', name: 'scott', role: 'host', online: true },
  { id: 'seat2', name: 'Alex', role: 'guest', online: true },
]
const typing = (seq: number, on: boolean, ts = 1_000) => ({
  seq,
  events: [{ seq, type: 'typing', ts, from: { seat: 'seat2', name: 'Alex', role: 'guest' }, body: { on } }],
  people,
  ended: false,
  title: 'demo',
})
const shown = async (ui: { find: (q: never) => Promise<unknown> }) => Boolean(await ui.find({ type: 'Text', text: /입력 중/ } as never))

test("a teammate writing shows in the host's row, and goes once they stop", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(typing(2, true))
  expect(await within(asked.clock, () => Object.keys(asked.state.typing ?? {}).length === 1, 5_000)).toBe(true)
  pages.length = 0
  expect(await shown(ui)).toBe(true)
  pages.push(typing(3, false))
  expect(await within(asked.clock, () => Object.keys(asked.state.typing ?? {}).length === 0, 5_000)).toBe(true)
  pages.length = 0
  expect(await shown(ui)).toBe(false)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test('a "writing" with no word after it ends on its own', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(typing(2, true))
  expect(await within(asked.clock, () => Object.keys(asked.state.typing ?? {}).length === 1, 5_000)).toBe(true)
  pages.length = 0
  expect(await within(asked.clock, () => Object.keys(asked.state.typing ?? {}).length === 0, 10_000)).toBe(true)
  expect(await shown(ui)).toBe(false)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test("one from a reconnect's catch-up, long over, isn't shown", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  await asked.clock.advance(60_000)
  pages.push(typing(2, true, 1_000))
  await asked.clock.advance(2_000)
  pages.length = 0
  expect(Object.keys(asked.state.typing ?? {})).toHaveLength(0)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test("the host writing in the prompt box tells the room, once, and sending says it stopped; the words don't go", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  on('prompt.edit', ($, e) => {
    const text = `${e.text.slice(0, e.start)}${e.inputText}${e.text.slice(e.end)}`
    return { text, cursor: e.start + e.inputText.length }
  })
  on('prompt.change', ($, e) => ({ text: e.text }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['terminal'], stream: pages })
  const ui = await $.ui.mount(band('terminal'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  // Alex is here: what the host writes is worth saying.
  pages.push({ seq: 2, events: [], people, ended: false, title: 'demo' })
  await asked.clock.advance(2_000)
  pages.length = 0
  const edit = (text: string, inputText: string) =>
    $.prompt.edit({ origin: { kind: 'composer' }, text, cursor: text.length, start: text.length, end: text.length, inputText } as never)
  await edit('', 'h')
  await edit('h', 'i')
  await asked.clock.advance(100)
  const sent = () => asked.posted.filter(p => p.type === 'typing')
  expect(sent()).toEqual([{ type: 'typing', body: { on: true } }])
  expect(JSON.stringify(sent())).not.toContain('hi')
  await $.prompt.change({ text: '', cursor: 0, origin: { kind: 'clear' } } as never)
  await asked.clock.advance(100)
  expect(sent().at(-1)).toEqual({ type: 'typing', body: { on: false } })
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test('alone in the room, writing says nothing', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  on('prompt.edit', ($, e) => ({ text: `${e.text}${e.inputText}`, cursor: e.text.length + e.inputText.length }))
  const asked = world(on, { surfaces: ['terminal'] })
  const ui = await $.ui.mount(band('terminal'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  await $.prompt.edit({ origin: { kind: 'composer' }, text: '', cursor: 0, start: 0, end: 0, inputText: 'h' } as never)
  await asked.clock.advance(100)
  expect(asked.posted.filter(p => p.type === 'typing')).toHaveLength(0)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test("writing in the Room's chat says so on desktop too, and sending it says it stopped", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(typing(2, true))
  expect(await within(asked.clock, () => Object.keys(asked.state.typing ?? {}).length === 1, 5_000)).toBe(true)
  pages.length = 0
  const pane = await $.ui.mount({ plugin: 'shared-session', surface: 'desktop', component: 'Pane', requestId: 'shared-room', props: PANE })
  await pane.press({ key: 'tab-chat' })
  // Alex writing shows above the chat's field.
  expect(await shown(pane)).toBe(true)
  await pane.input({ key: 'chat-input-0', text: 'on my way', kind: 'change' })
  await asked.clock.advance(100)
  expect(asked.posted.filter(p => p.type === 'typing')).toEqual([{ type: 'typing', body: { on: true } }])
  await pane.input({ key: 'chat-input-0', text: 'on my way' })
  await asked.clock.advance(100)
  const sent = asked.posted.filter(p => p.type === 'typing' || p.type === 'chat')
  expect(sent.slice(-2)).toEqual([
    { type: 'chat', body: { text: 'on my way' } },
    { type: 'typing', body: { on: false } },
  ])
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})
