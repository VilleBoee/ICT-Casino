import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { play } from '../app/sound'
import type { Card as EngineCard, Rank, Suit } from '../engine/types'

const RANK_LABEL: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
}
const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }
const RANK_NAME: Partial<Record<Rank, string>> = { 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' }

export const rankLabel = (r: Rank) => RANK_LABEL[r]
export const suitGlyph = (s: Suit) => SUIT_GLYPH[s]
export const cardLabel = (c: EngineCard) => `${RANK_NAME[c.rank] ?? c.rank} of ${SUIT_NAME[c.suit]}`

export interface CardProps {
  card: EngineCard
  /** Show the back instead of the face (e.g. dealer hole card). Toggling flips. */
  faceDown?: boolean
  /** Index in the hand; staggers the deal animation. */
  dealIndex?: number
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
}

/** Corner index (rank over suit), sized relative to the card's font size. */
const CORNER = 'absolute flex flex-col items-center text-[0.8em] leading-[0.95] tracking-tighter'
const SIZES = { sm: 'w-12 h-[4.5rem] text-sm', md: 'w-16 h-24 text-base', lg: 'w-20 h-[7.5rem] text-lg' }

/** Playing card rendered from the engine `Card` type, with deal + flip animations. */
export function Card({ card, faceDown = false, dealIndex = 0, size = 'md', highlight = false }: CardProps) {
  const reduce = useReducedMotion()
  // deal swish timed with the deal animation; flip snap whenever faceDown changes
  useEffect(() => {
    if (reduce) return
    const id = setTimeout(() => play('deal'), dealIndex * 120)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const prevDown = useRef(faceDown)
  useEffect(() => {
    if (prevDown.current !== faceDown) play('flip')
    prevDown.current = faceDown
  }, [faceDown])
  const red = card.suit === 'H' || card.suit === 'D'
  const rank = RANK_LABEL[card.rank]
  const suit = SUIT_GLYPH[card.suit]
  const face = 'absolute inset-0 rounded-md border [backface-visibility:hidden]'
  return (
    <motion.div
      role="img"
      aria-label={faceDown ? 'face-down card' : cardLabel(card)}
      className={`relative shrink-0 overflow-hidden rounded-md [perspective:600px] ${SIZES[size]}`}
      initial={reduce ? false : { opacity: 0, y: -40, x: 30, rotate: -8 }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, delay: dealIndex * 0.12 }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: 'easeInOut' }}
      >
        <div
          className={`${face} overflow-hidden bg-fg font-mono font-bold leading-none ${
            red ? 'text-[#c81e3a]' : 'text-bg'
          } ${highlight ? 'border-neon shadow-glow-neon' : 'border-border'}`}
        >
          {/* corners are absolutely placed in em/% of the card, so they stay inside at every size (sm..lg) */}
          <span className={CORNER} style={{ left: '7%', top: '5%' }}>{rank}<span>{suit}</span></span>
          <span className="absolute inset-0 grid place-items-center text-[1.6em]" aria-hidden>{suit}</span>
          <span className={`${CORNER} rotate-180`} style={{ right: '7%', bottom: '5%' }}>{rank}<span>{suit}</span></span>
        </div>
        <div
          className={`${face} border-neon/40 bg-surface-2 [transform:rotateY(180deg)]`}
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgb(57 255 136 / .12) 0 2px, transparent 2px 8px)',
          }}
        >
          <span className="absolute inset-0 grid place-items-center font-mono text-xs text-neon">{'</>'}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
