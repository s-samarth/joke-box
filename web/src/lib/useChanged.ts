import { useState } from 'react'

/**
 * Has this value changed since the component first rendered? For a sheet to ask before
 * throwing away typing (Modal's `dirty`). Compared as JSON, so pass plain data.
 */
export function useChanged(value: unknown): boolean {
  const [first] = useState(() => JSON.stringify(value))
  return JSON.stringify(value) !== first
}
