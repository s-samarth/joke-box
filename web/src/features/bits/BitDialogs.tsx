/**
 * One place that owns the bit editor and detail dialogs. Any screen can call
 * `useBitDialogs().openEditor(...)` or `.openDetail(bit)` instead of managing dialogs itself.
 */
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useDeleteBit, useTopics } from '../../api/library'
import type { Bit } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { BitDetail } from './BitDetail'
import { BitDialogsContext, type BitDialogs } from './bitDialogsContext'
import { BitEditor } from './BitEditor'
import { draftFrom, type Prefill } from './useBitDraft'

type State = { kind: 'edit'; bit?: Bit; prefill: Prefill; key: number } | { kind: 'detail'; bit: Bit } | null

export function BitDialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null)
  const { data: topics = [] } = useTopics()
  const remove = useDeleteBit()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const randomId = topics.find((t) => t.is_system)?.id ?? ''

  const api: BitDialogs = {
    openEditor: (bit, prefill = {}) => setState({ kind: 'edit', bit, prefill, key: Date.now() }),
    openDetail: (bit) => setState({ kind: 'detail', bit }),
    deleteBit: async (bit) => {
      const ok = await confirm({
        title: 'Delete this bit?',
        message: 'Its brainstorms and setlist spots go with it. This can’t be undone.',
        confirmLabel: 'Delete',
        danger: true,
      })
      if (!ok) return
      remove.mutate(bit.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
      setState(null)
      toast('Bit deleted')
    },
    openInStudio: (bit) => {
      setState(null)
      navigate(`/studio/${bit.id}`)
    },
  }

  return (
    <BitDialogsContext.Provider value={api}>
      {children}
      {state?.kind === 'edit' && (
        <BitEditor key={state.key} bit={state.bit} initial={draftFrom(state.bit, state.prefill, randomId)} onClose={() => setState(null)} />
      )}
      {state?.kind === 'detail' && (
        <BitDetail
          bit={state.bit}
          onClose={() => setState(null)}
          onEdit={() => api.openEditor(state.bit)}
          onStudio={() => api.openInStudio(state.bit)}
          onDelete={() => api.deleteBit(state.bit)}
        />
      )}
    </BitDialogsContext.Provider>
  )
}
