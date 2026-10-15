import type { ComponentType } from 'react'
import { gameById } from '../app/games'
import { href } from '../app/router'
import type { GameId } from '../engine/types'
import NotFound from './NotFound'

/** Game UIs register here as they land (#12, #15, ...). */
const SCREENS: Partial<Record<GameId, ComponentType>> = {}

export default function GamePage({ id }: { id: string }) {
  const game = gameById(id)
  if (!game) return <NotFound />
  const Screen = SCREENS[game.id]
  return (
    <div className="space-y-6">
      <a href={href('/')} className="font-mono text-sm">← cd ..</a>
      {Screen ? <Screen /> : (
        <div className="panel space-y-3 text-center">
          <p className="font-mono text-5xl text-neon" aria-hidden>{game.icon}</p>
          <h1>{game.name}</h1>
          <p className="font-mono text-warn">// coming soon</p>
          <p className="text-muted">{game.tagline}. This table is still being built.</p>
          <a href={href('/')} className="btn-primary no-underline hover:no-underline">Back to lobby</a>
        </div>
      )}
    </div>
  )
}
