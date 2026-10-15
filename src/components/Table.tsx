import type { ReactNode } from 'react'

export interface TableProps {
  title: string
  /** Small status text in the header, e.g. "6 decks · S17". */
  subtitle?: string
  /** Right side of the header (balance, buttons). */
  actions?: ReactNode
  /** Controls area below the felt (BetPanel, action buttons). */
  footer?: ReactNode
  children: ReactNode
}

/** Terminal-window styled game table: title bar, felt area, controls. */
export function Table({ title, subtitle, actions, footer, children }: TableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel" aria-label={title}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface-2 px-3 py-2 sm:flex-nowrap sm:px-4">
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-3 w-3 rounded-full bg-lose/80" />
          <i className="h-3 w-3 rounded-full bg-warn/80" />
          <i className="h-3 w-3 rounded-full bg-win/80" />
        </span>
        <h2 className="text-sm">{title}</h2>
        <div className="ml-auto min-w-0 sm:order-last">{actions}</div>
        {subtitle && <span className="order-last basis-full font-mono text-xs text-muted sm:order-none sm:basis-auto">{subtitle}</span>}
      </header>
      <div
        className="relative min-h-64 p-3 sm:p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--felt-glow), var(--felt-fade) 75%), linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 24px 24px',
        }}
      >
        {children}
      </div>
      {footer && <div className="border-t border-border p-3 sm:p-4">{footer}</div>}
    </section>
  )
}
