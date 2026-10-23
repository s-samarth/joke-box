/** Type and spacing shared by a note read as a whole (NoteBody) and edited block by block (EditableBody). */

export const BODY_TEXT = 'space-y-3 text-[15px] leading-relaxed text-paper/90'

/** The space above a heading, which sets off a new section. Dropped for the first block. */
export const HEADING_GAP = { 1: 'mt-7', 2: 'mt-6', 3: 'mt-4' } as const
