// A prompt the host types while a turn runs reaches the room as the host's words.
import { expect, test } from 'claude-code/testing'
import { band, world } from './support/world'

const REMINDER = (words: string) =>
  `<system-reminder>\nThe user sent a new message while you were working:\n${words}\n\nThis is how Claude Code surfaces messages the user sends mid-turn.\n</system-reminder>`

async function shared($: any, on: any) {
  const asked = world(on)
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  await asked.clock.advance(50)
  return asked
}

const rowsOf = (asked: any) => asked.posted.filter((e: any) => e.type === 'row').map((e: any) => [e.body.kind, e.body.text])

test('a prompt the host typed mid-turn, folded into the running turn as an attachment, goes to the room as the host said it', async ($, on) => {
  const asked = await shared($, on)
  const typed = { type: 'user', role: 'user', content: [{ type: 'text', text: 'Also check the docs' }] }
  await $.session.append({ message: typed, door: 'queue', origin: { kind: 'composer' }, uuid: 'q1' } as never)
  await asked.clock.advance(100)
  expect(rowsOf(asked)).toEqual([])
  const folded = { type: 'attachment', name: 'queued_command', content: [{ type: 'text', text: REMINDER('Also check the docs') }] }
  await $.session.append({ message: folded, door: 'attachment', origin: { kind: 'engine' }, uuid: 'a1' } as never)
  await asked.clock.advance(100)
  expect(rowsOf(asked)).toEqual([['user', 'Also check the docs']])
})

test('one folded in with no queue record seen is read from its reminder', async ($, on) => {
  const asked = await shared($, on)
  const folded = { type: 'attachment', name: 'queued_command', content: [{ type: 'text', text: REMINDER('Use the staging key\nnot the live one') }] }
  await $.session.append({ message: folded, door: 'attachment', origin: { kind: 'engine' }, uuid: 'a1' } as never)
  await asked.clock.advance(100)
  expect(rowsOf(asked)).toEqual([['user', 'Use the staging key\nnot the live one']])
})

test('a notification folded into a turn the same way is no one\'s prompt, and another attachment is left alone', async ($, on) => {
  const asked = await shared($, on)
  const note = { type: 'attachment', name: 'queued_command', content: [{ type: 'text', text: '<task-notification>\n<status>completed</status>\n</task-notification>' }] }
  await $.session.append({ message: note, door: 'attachment', origin: { kind: 'engine' }, uuid: 'a1' } as never)
  const memory = { type: 'attachment', name: 'nested_memory', content: [{ type: 'text', text: REMINDER('not a prompt') }] }
  await $.session.append({ message: memory, door: 'attachment', origin: { kind: 'engine' }, uuid: 'a2' } as never)
  await asked.clock.advance(100)
  expect(rowsOf(asked)).toEqual([])
})
