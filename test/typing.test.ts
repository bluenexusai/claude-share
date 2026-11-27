// Someone writing: a flag a seat posts, passed on to the room's readers and never kept in its history.
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { Room, roomRequest } from '../server/core/index.ts'

const post = (room: Room, token: string, events: unknown[]) =>
  roomRequest(
    room,
    new Request(`https://share.test/api/rooms/${room.id}/events`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ events }),
    }),
    'events',
    Date.now(),
    'https://share.test',
  )

test("a guest's and the host's typing reach readers as a flag alone, and the history doesn't keep them", async () => {
  const room = Room.create({ id: 'w'.repeat(16), name: 'Host', title: 't', now: Date.now(), fromNow: false, version: null, team: null, account: null })
  const { token: seat } = room.join('Guest', Date.now(), null, null)
  const before = room.seq
  const guest = await post(room, seat, [{ type: 'typing', body: { on: true, text: 'what they wrote' } }])
  assert.equal(guest.response.status, 200)
  assert.equal(guest.changed, false)
  const host = await post(room, room.host.token, [{ type: 'typing', body: { on: 'yes' } }])
  assert.equal(host.response.status, 200)
  const seen = room.since(before).filter(e => e.type === 'typing')
  assert.deepEqual(
    seen.map(e => [e.from.name, e.body]),
    [
      ['Guest', { on: true }],
      ['Host', { on: false }],
    ],
  )
  assert.equal(
    room.events.some(e => e.type === 'typing'),
    false,
  )
})
