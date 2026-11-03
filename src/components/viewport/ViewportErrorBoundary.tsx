import { Component, type ReactNode } from 'react'

// Keeps a 3D failure inside the preview box instead of blanking the whole app
export class ViewportErrorBoundary extends Component<{ message: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('3D preview failed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-shell p-6 text-center">
        <p className="text-sm">{this.props.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className="rounded-full bg-foam px-4 py-1 text-sm hover:bg-secondary"
        >
          ↻
        </button>
      </div>
    )
  }
}
