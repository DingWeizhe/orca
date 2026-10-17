import { describe, expect, it } from 'vitest'
import { gateState, gateVerdict } from './mobile-web-shell-gates'
import { gates } from './mobile-web-shell-session-test-fixtures'

describe('the gate for a desktop that serves no page', () => {
  it('walls it as a desktop to update rather than handing the route to a native screen', () => {
    const verdict = gateVerdict(gates({ hostCapabilities: [] }))
    expect(verdict).toEqual({
      kind: 'wall',
      verdict: { kind: 'blocked', reason: 'bundle-unavailable' }
    })
    expect(gateState(verdict, false)).toEqual({
      kind: 'wall',
      verdict: { kind: 'blocked', reason: 'bundle-unavailable' }
    })
  })

  it('still opens a host that serves one', () => {
    expect(gateVerdict(gates())).toEqual({ kind: 'open' })
  })
})
