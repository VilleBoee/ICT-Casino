import { href } from '../app/router'

export default function NotFound() {
  return (
    <div className="panel space-y-3 text-center">
      <h1>404</h1>
      <p className="font-mono text-lose">bash: route not found</p>
      <a href={href('/')} className="btn-primary no-underline hover:no-underline">Back to lobby</a>
    </div>
  )
}
