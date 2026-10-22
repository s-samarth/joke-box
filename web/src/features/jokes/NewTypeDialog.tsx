/** Name a new type and pick its colour. Typing an existing type's name shows its colour. */
import { useState } from 'react'
import { useTypes } from '../../api/library'
import { useSetTypeColor, useTypeColor } from '../../api/typeColors'
import { Button } from '../../components/ui/Button'
import { ColorSwatches } from '../../components/ui/ColorSwatches'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Field, Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { DEFAULT_TYPE_COLORS, nextFreeColor } from '../../lib/typeColors'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (name: string) => void
}

export function NewTypeDialog({ open, onClose, onAdd }: Props) {
  const { data: types = [] } = useTypes()
  const colorOf = useTypeColor()
  const setColor = useSetTypeColor()
  const { toast } = useFeedback()
  const [name, setName] = useState('')
  // Null until you tap a swatch, so the colour follows the name you're typing until then.
  const [picked, setPicked] = useState<string | null>(null)

  const trimmed = name.trim()
  const key = trimmed.toLowerCase()
  const known = types.some((t) => t.name.toLowerCase() === key) || key in DEFAULT_TYPE_COLORS
  const color = picked ?? (known ? colorOf(trimmed) : nextFreeColor(types.map((t) => t.color)))

  const close = () => {
    setName('')
    setPicked(null)
    onClose()
  }
  const add = () => {
    if (!trimmed) return
    if (picked || !known) setColor.mutate({ name: trimmed, color }, { onError: () => toast("Couldn't save the colour. Try again from Edit types.") })
    onAdd(trimmed)
    close()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="New type"
      footer={
        <>
          <Button variant="quiet" onClick={close}>Cancel</Button>
          <Button variant="tape" onClick={add} disabled={!trimmed}>Add type</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); add() }} className="space-y-5">
        <Field label="Name">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 size-2.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <Input autoFocus value={name} placeholder="e.g. Callback" onChange={(e) => setName(e.target.value)} maxLength={80} className="pl-9" />
          </div>
        </Field>
        {/* Not a Field: that is a <label>, and a label can't hold a whole group of inputs. */}
        <div className="space-y-2">
          <span className="block text-sm text-dim" aria-hidden>Colour</span>
          <ColorSwatches value={color} onChange={setPicked} />
        </div>
      </form>
    </Modal>
  )
}
