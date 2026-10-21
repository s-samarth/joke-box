/**
 * Where the time scrubber sits on a page that scrolls as a whole: down the right edge, between the
 * phone's top bar and bottom bar (or the window's edges on desktop). Lists leave `RAIL_ROOM` free
 * on phones so the scrubber never covers a row's buttons.
 */
export const PAGE_RAIL = 'fixed right-0.5 top-[calc(4.5rem+env(safe-area-inset-top))] bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:right-3 lg:top-10 lg:bottom-10'
export const RAIL_ROOM = 'pr-5 lg:pr-0'
