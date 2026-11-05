/** The zoom steps shared by the joke map and the premise web. */
export const ZOOMS = [0.3, 0.4, 0.55, 0.7, 0.85, 1, 1.2]

/** The zoom that fits a drawing this wide into this much room (less the canvas padding), up to 100%. */
export const fitZoom = (room: number, width: number): number => Math.max(ZOOMS[0], Math.min(1, (room - 32) / Math.max(width, 1)))
