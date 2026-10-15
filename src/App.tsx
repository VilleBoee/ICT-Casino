import { useEffect, useRef } from 'react'
import { TopBar } from './app/TopBar'
import { usePath } from './app/router'
import DevPage from './pages/DevPage'
import GamePage from './pages/GamePage'
import Lobby from './pages/Lobby'
import NotFound from './pages/NotFound'
import StatsPage from './pages/StatsPage'
import { useT } from './i18n'

function route(path: string) {
  if (path === '/') return <Lobby />
  if (path === '/stats') return <StatsPage />
  if (path === '/dev') return <DevPage />
  const m = path.match(/^\/game\/([\w-]+)$/)
  if (m) return <GamePage id={m[1]} />
  return <NotFound />
}

export default function App() {
  const t = useT()
  const path = usePath()
  const main = useRef<HTMLElement>(null)
  // Move focus to the new page on navigation (keyboard + screen readers).
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (first.current) { first.current = false; return }
    main.current?.focus()
  }, [path])
  return (
    <>
      <a href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus() }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-neon focus:px-3 focus:py-2 focus:text-bg">
        {t('app.skip')}
      </a>
      <TopBar path={path} />
      <main ref={main} id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 outline-none">
        {route(path)}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 font-mono text-xs text-muted">
        {t('app.footer')}<a href="#/dev" className="inline-block pointer-coarse:px-2 pointer-coarse:py-3">/dev</a>
      </footer>
    </>
  )
}
