// 누구를 @ 로 불렀는지(2026-11-27): 한국어 꼬리(님 · 께 · 아 …)는 받고, 주소 · 경로 안의 @ 는 받지 않는다.
import { expect, test } from 'claude-code/testing'
import { mentionsOf } from '../hooks/room'

const names = ['jki', '민지', 'Jisoo Park', 'jkim', "O'Neil", 'Alex Kim']
const cases: [string, string[]][] = [
  ['@민지님 봐주세요', ['민지']],
  ['@민지께 여쭤봄', ['민지']],
  ['@민지님이 말한', ['민지']],
  ['@민지이랑', []],
  ['@지수아', []],
  ['@Jisoo 확인', ['Jisoo Park']],
  ['@JisooPark, 확인', ['Jisoo Park']],
  ['@Jisoo님 확인', ['Jisoo Park']],
  ['medium.com/@jkim 글', []],
  ['@jkim/utils 패키지', []],
  ['@jkimx/utils', []],
  ['a@jkim.com', []],
  ['@jkim.', ['jkim']],
  ['(@jkim) 확인', ['jkim']],
  ["@O'Neil 봐요", ["O'Neil"]],
  ['@AlexKim — 확인', ['Alex Kim']],
]

for (const [text, want] of cases) {
  test(`${text} → ${want.join(', ') || '없음'}`, () => {
    expect(mentionsOf(text, names)).toEqual(want)
  })
}

test('첫 낱말이 둘과 겹치면(@Kim) 아무도 부르지 않고, 전체 이름은 부른다', () => {
  const two = ['Kim Minji', 'Kim Jisoo', 'Park Sora']
  expect(mentionsOf('@Kim 확인', two)).toEqual([])
  expect(mentionsOf('@KimMinji 확인', two)).toEqual(['Kim Minji'])
  expect(mentionsOf('@Park 확인', two)).toEqual(['Park Sora'])
})
