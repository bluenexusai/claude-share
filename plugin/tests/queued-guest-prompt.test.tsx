// A teammate's prompt that arrives while a turn runs waits for the turn to end: the host is told it came.
import { expect, test } from 'claude-code/testing'
import { band, world, within } from './support/world'

const people = [
  { id: 'host', name: 'scott', role: 'host', online: true },
  { id: 'seat2', name: 'Alex', role: 'guest', online: true },
]
const prompt = (seq: number, text: string) => ({
  seq,
  events: [{ seq, type: 'prompt', ts: 900, from: { seat: 'seat2', name: 'Alex', role: 'guest' }, body: { text, pid: `p${seq}` } }],
  people,
  ended: false,
  title: 'demo',
})

test("a teammate's prompt that arrives while a turn runs is said to the host as it waits", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  await $.turn.start({ turnId: 'host-1', text: 'what changed?' })
  pages.push(prompt(2, 'Run the tests'))
  expect(await within(asked.clock, () => asked.state.guestPrompts?.length === 1, 5_000)).toBe(true)
  pages.length = 0
  expect(asked.toasted.filter(t => t.startsWith('Alex: Run the tests'))).toHaveLength(1)
  await $.turn.complete({ turnId: 'host-1', isAborted: false, durationMs: 0, reason: 'answer', answer: '' } as never)
  await within(asked.clock, () => asked.submitted.length > 0, 1_000)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})

test("one that arrives while the session is idle goes straight to Claude, with nothing said", async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push(prompt(2, 'Run the tests'))
  expect(await within(asked.clock, () => asked.submitted.length > 0, 5_000)).toBe(true)
  pages.length = 0
  expect(asked.toasted.filter(t => t.startsWith('Alex: '))).toHaveLength(0)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
})
