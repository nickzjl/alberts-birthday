import { Component, type ReactNode } from 'react'
import { BigButton } from '../ui/BigButton'

interface Props {
  children: ReactNode
  /** gets the error that was caught (App reloads the page for a failed chunk download) */
  onRetry: (error: Error) => void
  onSkip: () => void
}

interface State {
  error: Error | null
}

/**
 * If a scene crashes (or its chunk fails to load), show a joke instead of a white screen.
 * "Try again" remounts the scene with a fresh lazy loader — or, if the scene's chunk failed to
 * download, reloads the page (browsers cache a failed dynamic import) — and "Skip it" brain-wipes
 * to the next experience. Re-keyed per scene by App, so a crash never follows you to the next one.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[scene crashed]', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="scene-error" role="alert">
        <div className="scene-error__card">
          <div className="scene-error__emoji" aria-hidden="true">
            🫠
          </div>
          <h2>This brain cell has stopped working.</h2>
          <p>Something broke while loading this part of the brain. Probably Cartman.</p>
          <div className="scene-error__actions">
            <BigButton variant="acid" size="md" autoFocus onClick={() => this.state.error && this.props.onRetry(this.state.error)} icon={<span aria-hidden="true">↻</span>}>
              Try again
            </BigButton>
            <BigButton variant="ghost" size="md" sound="whoosh" onClick={() => this.props.onSkip()} trailing={<span aria-hidden="true">→</span>}>
              Skip it
            </BigButton>
          </div>
        </div>
      </div>
    )
  }
}
