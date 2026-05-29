# SFX assets

Seven short sound files drive in-app game feel: flashcard flips, quiz answer
feedback, lesson completion, and league rank-ups. They are loaded by
[`lib/sfx.ts`](../../lib/sfx.ts) via Metro `require()`, which means files must
exist at bundle time. The require lines are commented out by default — drop
the files in, uncomment the lines in `sfx.ts`, and SFX is live.

## Files needed

| Filename | Trigger | Recommended length | Recommended feel |
|---|---|---|---|
| `flip.mp3` | Flashcard reveal | 180–300ms | Soft paper / card snap |
| `tap.mp3` | Light interaction (sfx.tap) | 80–150ms | Subtle UI click |
| `select.mp3` | Quiz option pick | 100–200ms | Pluck / mid-low pop |
| `correct.mp3` | Right answer | 300–600ms | Bright two-note rising chime |
| `wrong.mp3` | Wrong answer | 250–500ms | Soft buzz / low descending tone (not punishing) |
| `complete.mp3` | Deck or quiz finished | 800–1500ms | Resolved chord, satisfying close |
| `celebrate.mp3` | Lesson passed, league rank-up | 1500–2500ms | Stinger with confetti energy |

## Technical requirements

- **Format**: 128 kbps MP3 (best Metro compatibility, smaller than WAV)
- **Sample rate**: 44.1 kHz mono
- **Loudness**: -14 LUFS integrated (roughly match iOS / Android system sound levels)
- **Total budget**: aim for <300 KB combined to keep bundle lean
- **Naming**: lowercase, exact filenames above (Metro require resolves at bundle time, names are case-sensitive on iOS)

## Where to source

**Free / CC0 (commercial OK, no attribution):**
- <https://freesound.org/browse/tags/cc0/> — search "ui pop", "card flip", "success chime"
- <https://kenney.nl/assets/category:Audio> — Kenney's UI Audio packs are CC0
- <https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=13&sort_by=count&sort_order=DESC> — filter to "License: CC0"

**Paid / curated:**
- <https://soundsnap.com> — interaction kits, subscription
- <https://www.epidemicsound.com> — clearance guaranteed, subscription
- <https://www.zapsplat.com> — quick UI library

If using freesound.org, batch-export as MP3 mono 128k via a converter like Audacity to hit the spec above.

## Activating SFX once files are dropped

1. Place the seven MP3s in this directory (`assets/sounds/`).
2. Open [`lib/sfx.ts`](../../lib/sfx.ts).
3. Uncomment the `require(...)` lines in the `SOURCES` map.
4. Restart the Metro bundler (Metro caches dynamic requires aggressively): `npx expo start --clear`.
5. Verify by tapping a flashcard or completing a quiz — sounds should play immediately.

The volume defaults to 0.7 (see `getOrLoad` in `lib/sfx.ts`) and respects the
`sfx.setMuted()` toggle. If you add a Settings switch later, wire it through that.

## Tone guidance

Match the ChattaTutor brand — **playful but professional**. Not phone-game arcade
volume. Not boring corporate. Think Duolingo's lesson-pass chime: short,
satisfying, hard to dislike on the 50th hearing.

For wrong-answer feedback specifically: avoid punishing buzzers. Users are
learning — a soft "hmm, not quite" tone keeps morale up. Test repeated
playback before committing; an annoying sound is worse than no sound.
