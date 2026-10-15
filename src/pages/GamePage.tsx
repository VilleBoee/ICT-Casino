import type { ComponentType } from 'react'
import { gameById, gameName, gameTagline } from '../app/games'
import { href } from '../app/router'
import type { GameId } from '../engine/types'
import NotFound from './NotFound'
import VideoPokerGame from '../games/video-poker/VideoPokerGame'
import BlackjackGame from '../games/blackjack/BlackjackGame'
import SlotsGame from '../games/slots/SlotsGame'
import BaccaratGame from '../games/baccarat/BaccaratGame'
import CrashGame from '../games/crash/CrashGame'
import PajatsoGame from '../games/pajatso/PajatsoGame'
import DiceGame from '../games/dice/DiceGame'
import HoldemGame from '../games/holdem/HoldemGame'
import RouletteGame from '../games/roulette/RouletteGame'
import PlinkoGame from '../games/plinko/PlinkoGame'
import { useT } from '../i18n'

/** Game UIs register here as they land (#12, #15, ...). */
const SCREENS: Partial<Record<GameId, ComponentType>> = { roulette: RouletteGame, blackjack: BlackjackGame, slots: SlotsGame, baccarat: BaccaratGame, crash: CrashGame, dice: DiceGame, pajatso: PajatsoGame, holdem: HoldemGame, videopoker: VideoPokerGame, plinko: PlinkoGame }

export default function GamePage({ id }: { id: string }) {
  const t = useT()
  const game = gameById(id)
  if (!game) return <NotFound />
  const Screen = SCREENS[game.id]
  return (
    <div className="space-y-6">
      <a href={href("/")} className="inline-block font-mono text-sm pointer-coarse:py-3">← cd ..</a>
      {Screen ? <Screen /> : (
        <div className="panel space-y-3 text-center">
          <p className="font-mono text-5xl text-neon" aria-hidden>{game.icon}</p>
          <h1>{gameName(t, game.id)}</h1>
          <p className="font-mono text-warn">{t('gp.soon')}</p>
          <p className="text-muted">{gameTagline(t, game.id)}. {t('gp.building')}</p>
          <a href={href('/')} className="btn-primary no-underline hover:no-underline">{t('common.backToLobby')}</a>
        </div>
      )}
    </div>
  )
}
