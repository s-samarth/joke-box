# Design system: "Taped setlist"

The look comes from a comic's notebook after midnight: ink-navy night, paper-coloured text, and
masking tape as the only accent. The tape is how comics stick a setlist to the stage floor.
The open-mic "light" (amber, then red) is used only for timing.

The tokens are defined once, in [app.css](../web/src/app.css) inside a Tailwind v4 `@theme`
block, so every token is also a utility class (`bg-ink-2`, `text-tape`, `ring-rule`...).

## Colour

| Token | Hex | Used for |
|---|---|---|
| `ink` | `#151923` | Page background, PWA theme colour |
| `ink-2` | `#1b2030` | Cards, inputs, the rail |
| `ink-3` | `#242a3b` | Raised surfaces, selected rows, chips |
| `ink-4` | `#2e3549` | Hover on raised surfaces, scrollbar thumb |
| `rule` / `rule-strong` | paper at 9% / 16% | Hairline borders and dividers |
| `paper` | `#ece6da` | Body text |
| `dim` | `#a3a7b3` | Secondary text |
| `faint` | `#6f7689` | Hints, meta, placeholders |
| `tape` / `tape-deep` | `#f0cf5a` / `#d8b744` | The accent: primary buttons, punchlines, focus ring, the light bar while there's room |
| `tape-ink` | `#2b2512` | Text on tape |
| `amber` | `#ffb547` | The last minute of the slot; offline |
| `light` | `#ff5a47` | Over time; destructive actions; errors |
| `ok` | `#74d3a8` | Success |

Joke types get a small coloured dot, never a filled chip: One-Liner sky, Story violet,
Crowd Work amber, Roast rose, Observation emerald, Premise pink, Act Out orange. Every other type
is given the next colour none of your types has, and you can pick any type's colour (40 swatches
plus a custom picker) when you create it or in Edit types
([typeColors.ts](../web/src/lib/typeColors.ts)). A type with no colour, like Undefined, is `faint`.

**Rule:** yellow means "this is yours, or this is the action". Don't use tape colour for
decoration.

## Type

- **Archivo Variable** (self-hosted through Fontsource) for everything. Its width axis does the
  work of a second font: the `.headline` class squeezes it to 75% width at weight 750 with
  tight leading, for gig-poster headings ("Got something?", page titles, stat numbers).
- **Permanent Marker** appears only on tape strips: setlists, stage mode, print and the login
  page. It's the handwriting on the tape.
- **Sizes:** 16 px body text, with inputs never below 16 px on phones (so iOS doesn't zoom in).
  Headlines are 44–56 px on Home and about 48 px for page titles.
- `.tabular` switches on tabular numbers, so timers and durations don't jitter.

## The tape strip

`.tape` in `app.css`, used through `<Tape seed dim>` in [jokes.tsx](../web/src/components/ui/jokes.tsx):

- A gradient of tape yellow with a faint vertical fibre texture.
- Torn ends, made with a zig-zag `clip-path`.
- A slight tilt (`--tilt`), set per strip from `seed`, so strips look slapped down by hand.
- `.tape-dim` desaturates and darkens a strip (jokes already in the set, or not yet reached on
  stage).

## Layout

- **Phone first.** Every screen is designed at 390 px. The content column is at most about 672 px
  on reading screens, wider on Shows and in the set builder.
- **Desktop:** a 240 px rail on the left, with the content centred. Jokes use a two-pane
  list-and-detail layout.
- **Phone:** a header plus a bottom bar with a raised round **+** in the middle. Safe areas are
  respected (`.pt-safe`, `.pb-safe`) and pinch-zoom is allowed.
- **Tap targets** are at least 44 px. Buttons are 44 px tall on phones and 40 px on desktop.
- **Sheets:** `Modal` is a bottom sheet with a grab bar on phones and a centred panel on desktop.

## Components

All in [components/ui/](../web/src/components/ui/). Radix supplies the behaviour and the
accessibility (focus trapping, Escape, screen readers); Tailwind supplies the look.

| Component | What it is |
|---|---|
| `Button` | Variants `tape` (the primary action), `plain`, `quiet` and `danger`; `small`; an optional icon |
| `IconButton` | Square icon button with a required `label` for screen readers |
| `Field`, `Input`, `Select`, `Textarea`, `GrowingText` | A labelled row and inputs; `GrowingText` grows with its content |
| `Modal` | Radix Dialog as a sheet or panel, with title, description and footer |
| `Dropdown`, `WithContextMenu` | Radix menus; the context menu opens on right-click or long-press |
| `StrengthTicks`, `Stars`, `TypeLabel`, `Tape` | Small displays for a joke and a show |
| `PageHead`, `SectionHead`, `EmptyState`, `Spinner` | Page structure |
| `FeedbackProvider` / `useFeedback()` | `toast(msg, action?)`, `confirm({...})`, `prompt({...})` from anywhere |

## Motion

There's very little of it, on purpose. Sheets slide and buttons change colour. The one animation
that loops is `.light-pulse`, the stage clock blinking when you're over time, and it is turned off
under `prefers-reduced-motion`.

## Focus and accessibility

- `:focus-visible` draws a 2 px tape-yellow outline. It sits in the base layer, so a component
  can swap in its own ring.
- Every icon-only control has a label. The sync light is `role="status"`.
- `aria-current="page"` marks the current tab, including **More** when you're on a screen that
  lives in it.

## Words in the app

The copy matters as much as the colours. These rules keep the text accurate and consistent.

1. **Speak comedian, not database.** Joke, set, show, slot, setup, punchline, tag line. The UI
   never says record, entry or item. See the glossary in [product.md](product.md#the-words-the-app-uses).
2. **Say what happens.** Buttons name their result: "Save joke", "Log a show", "Start a rewrite",
   "Export as CSV", "Delete joke". A toast uses the same verb as its button: "Joke saved",
   "Analysis saved".
3. **Sentence case, plain verbs.** "Log a show", not "Log A Show" or "Submit".
4. **Offline is a state, not an error.** "Saved offline, will sync". "Offline, 2 waiting to sync".
5. **Errors say what to do.** "Can't reach JokeBox. Check your connection, then try again." "A joke
   needs a setup to be saved." No apologies, no "Oops".
6. **Empty screens invite the next step.** "No sets yet. Build one for your next spot." "No shows
   logged yet. After your next spot, log it while it's fresh."
7. **Confirm only what can't be undone,** and say what goes with it: "Delete this joke? Its
   rewrites and its places in sets go too."
8. **Dates and times are always in India time** (`Asia/Kolkata`) and the `en-IN` format:
   "24 Oct 2025", "8:54 pm". Durations are `m:ss` ("4:15") or "29m 30s" in totals.
9. **The default topic is "Thoughts"** everywhere in the UI, even though it's stored as `Random`.
