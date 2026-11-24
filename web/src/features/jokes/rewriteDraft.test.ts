import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { keys, queryClient } from '../../api/queryClient'
import { draftKey, readText, writeText } from '../capture/deviceDraft'
import { forgetSavedRewrite, openRewrite, rewriteKey } from './rewriteDraft'

beforeEach(() => {
  const items = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  })
})
afterEach(() => { vi.unstubAllGlobals(); queryClient.clear() })

it('restores unsaved text for its account and session, including changes during a save', () => {
  queryClient.setQueryData(keys.me, { id: 'comic-a' })
  const key = rewriteKey('joke-1', 'session-1')
  const draft = { id: 'session-1', title: 'Fake draft', content: 'First line' }
  const newer = { ...draft, content: 'Later words' }
  writeText(key, JSON.stringify(newer))
  forgetSavedRewrite(key, draft)
  expect(openRewrite(key)).toEqual(newer)
  expect(readText(rewriteKey('joke-1', 'session-2'))).toBe('')
  queryClient.setQueryData(keys.me, { id: 'comic-b' })
  expect(readText(rewriteKey('joke-1', 'session-1'))).toBe('')
  forgetSavedRewrite(key, newer)
  expect(readText(key)).toBe('')
  expect(draftKey('capture.setup')).not.toBe(key)
})
