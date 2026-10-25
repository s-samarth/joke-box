/** Time on stage as typed into the minutes and seconds boxes. */
export type StageTime = { min: string; sec: string }

export const toStageTime = (seconds: number): StageTime => ({ min: String(Math.floor(seconds / 60)), sec: seconds % 60 ? String(seconds % 60) : '' })
export const stageSeconds = (t: StageTime): number => Number(t.min || 0) * 60 + Number(t.sec || 0)
