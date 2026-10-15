import { href } from '../app/router'
import { useT } from '../i18n'

export default function NotFound() {
  const t = useT()
  return (
    <div className="panel space-y-3 text-center">
      <h1>404</h1>
      <p className="font-mono text-lose">{t('nf.msg')}</p>
      <a href={href('/')} className="btn-primary no-underline hover:no-underline">{t('common.backToLobby')}</a>
    </div>
  )
}
