import * as Slider from '@radix-ui/react-slider'
import { Flames } from '../../../components/ui/bits'
import { strengthLabel } from '../../../lib/bitMeta'

/** Strength 1 to 5: Weak, Needs Work, Decent, Strong, Killer. */
export function StrengthSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Flames strength={value} size={16} />
        <span className="text-sm font-medium text-accent">{strengthLabel(value)}</span>
      </div>
      <Slider.Root
        className="relative flex h-6 touch-none items-center select-none"
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        aria-label="Strength"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-white/10">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        <Slider.Thumb className="block size-6 rounded-full bg-text shadow-pop ring-4 ring-accent/30 outline-none" />
      </Slider.Root>
      <div className="flex justify-between text-[11px] text-faint">
        <span>Weak</span>
        <span>Killer</span>
      </div>
    </div>
  )
}
