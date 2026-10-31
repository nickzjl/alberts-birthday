import { ghostSticker } from './GhostCan'
import { glovesSticker } from './Gloves'
import { gorillaSticker } from './GorillaCan'
import { guitarSticker } from './Guitar'
import { monsterSticker } from './MonsterCan'
import { pianoSticker } from './Piano'
import { recordsSticker } from './Records'
import { truFruSticker } from './TruFru'
import type { StickerDef } from './types'

/** Order = entrance order (they slap on one by one). */
export const STICKERS: StickerDef[] = [
  ghostSticker,
  gorillaSticker,
  recordsSticker,
  pianoSticker,
  guitarSticker,
  monsterSticker,
  truFruSticker,
  glovesSticker,
]

export type { StageApi, StickerDef, StickerId } from './types'
