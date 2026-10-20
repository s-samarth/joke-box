/** Record a voice note straight from Today, the screen the app opens on. */
import { Link } from 'react-router'
import { SectionHead } from '../../components/ui/bits'
import { Recorder } from '../voice/Recorder'
import { useVoiceLibrary } from '../voice/useVoiceLibrary'

export function TodayVoice() {
  const { notes } = useVoiceLibrary()
  return (
    <section className="mt-12">
      <SectionHead title="Voice notes">
        <Link to="/voice" className="text-sm text-dim hover:text-paper">{notes.length ? `All ${notes.length}` : 'Open'}</Link>
      </SectionHead>
      <Recorder />
    </section>
  )
}
