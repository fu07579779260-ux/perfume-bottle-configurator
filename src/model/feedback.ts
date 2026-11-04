import type { FitFeedback } from '@/persistence/designs'
import { RANGES, type DesignConfig } from './config'
import { designReducer } from './reducer'

// After a test print (PLAN.md §5): how the shell sat on the glass and how the
// cap held decide the next clearances. A tight fit opens up by 0.1 mm, a loose
// one closes by 0.05 mm (loose is easier to live with than stuck). When the
// clearance can't move any further, a different fit is suggested instead.

export const STEP_OPEN = 0.1
export const STEP_CLOSE = 0.05

export type FeedbackTip = 'ribs' | 'snapCap' | 'glassSmaller' | 'capLooser'

export interface FeedbackResult {
  config: DesignConfig
  shell: { from: number; to: number } | null
  cap: { from: number; to: number } | null
  tips: FeedbackTip[]
}

const round2 = (v: number) => Number(v.toFixed(2))

export function applyFeedback(config: DesignConfig, feedback: FitFeedback): FeedbackResult {
  const shellRange = RANGES.assembly.clearance
  const capRange = RANGES.cap.clearance
  const tips: FeedbackTip[] = []
  let next = config
  let shell: FeedbackResult['shell'] = null
  let cap: FeedbackResult['cap'] = null

  const from = config.assembly.clearance
  if (feedback.shell !== 'good') {
    const wanted = round2(from + (feedback.shell === 'tight' ? STEP_OPEN : -STEP_CLOSE))
    const to = Math.min(shellRange.max, Math.max(shellRange.min, wanted))
    if (to !== from) {
      next = designReducer(next, { type: 'patch', section: 'assembly', values: { clearance: to } })
      shell = { from, to }
    }
    if (to !== wanted) {
      if (feedback.shell === 'loose') tips.push(config.assembly.method === 'top' ? 'ribs' : 'glassSmaller')
      else tips.push('glassSmaller')
    }
  }

  const capFrom = config.cap.clearance
  if (feedback.cap !== 'good') {
    const wanted = round2(capFrom + (feedback.cap === 'stuck' ? STEP_OPEN : -STEP_CLOSE))
    const to = Math.min(capRange.max, Math.max(capRange.min, wanted))
    if (to !== capFrom) {
      next = designReducer(next, { type: 'patch', section: 'cap', values: { clearance: to } })
      cap = { from: capFrom, to }
    }
    if (to !== wanted) tips.push(feedback.cap === 'falls' && config.cap.fit === 'friction' ? 'snapCap' : 'capLooser')
  }

  return { config: next, shell, cap, tips }
}
