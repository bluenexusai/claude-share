// 방장 Claude 의 답에 든 @멘션 → 방 채팅 줄(2026-11-26).
import { expect, test } from 'claude-code/testing'
import { band, world, within } from './support/world'

const people = [
  { id: 'host', name: 'scott', role: 'host', online: true },
  { id: 'seat2', name: 'Alex Kim', role: 'guest', online: true },
]

async function hostAnswers($: any, on: any, answer: string) {
  on('turn.complete', () => ({ text: answer }))
  const pages: unknown[] = []
  const asked = world(on, { surfaces: ['desktop'], stream: pages })
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'share' })
  await ui.press({ key: 'share-prompt' })
  pages.push({ seq: 2, events: [], people, ended: false, title: 'demo' })
  await asked.clock.advance(2_000)
  pages.length = 0
  await $.turn.start({ turnId: 'host-1', text: 'what changed?' })
  await $.turn.complete({ turnId: 'host-1', isAborted: false, durationMs: 0, reason: 'answer', answer } as never)
  await within(asked.clock, () => asked.posted.some((e: any) => e.type === 'chat'), 3_000)
  const chats = asked.posted.filter((e: any) => e.type === 'chat').map((e: any) => e.body.text)
  await $.command.run({ command: 'stop-sharing', args: '' } as never)
  return chats
}

test('답에서 방 사람을 @ 로 부르면 그 줄이 방 채팅으로 간다', async ($, on) => {
  const chats = await hostAnswers($, on, '정리했습니다.\n\n**@AlexKim — 확인해 주세요.**\n\n나머지는 그대로입니다.')
  expect(chats).toEqual(['Claude: @AlexKim — 확인해 주세요.'])
})

test('첫 낱말로 불러도 간다', async ($, on) => {
  const chats = await hostAnswers($, on, '@Alex 확인 부탁드립니다.')
  expect(chats).toEqual(['Claude: @Alex 확인 부탁드립니다.'])
})

test('방에 없는 이름 · 코드 안의 @ · 메일 주소는 보내지 않는다', async ($, on) => {
  const chats = await hostAnswers($, on, '`@Alex` 은 코드입니다. @nobody 는 없는 사람, a@b.com 은 메일입니다.\n```\n@AlexKim\n```')
  expect(chats).toEqual([])
})
