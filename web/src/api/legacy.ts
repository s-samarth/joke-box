/**
 * Names from before bits were renamed jokes, so updating the app never loses work. Saves waiting
 * on a phone (queued, or in Couldn't sync) under the old key are kept for good, like every
 * shipped key (queuedKeys.test.ts).
 * The server reads the old names too (app/schemas/legacy.py).
 */

/** A save's key with the old "bit" kind renamed. */
export const renamedKey = (key: readonly unknown[]): unknown[] => (key[0] === 'bit' ? ['joke', ...key.slice(1)] : [...key])

/** The old mutation keys, to register the joke save and delete defaults under them as well. */
export const OLD_SAVE_KEYS = { save: ['bit', 'save'], delete: ['bit', 'delete'] }
