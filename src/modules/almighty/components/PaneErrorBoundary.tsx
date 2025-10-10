import React from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  paneName: string
}

interface State {
  hasError: boolean
  error?: Error
  errorKey: number
}

export class PaneErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${this.props.paneName}] Error:`, error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: undefined,
      errorKey: prev.errorKey + 1
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-background p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {this.props.paneName} encountered an error
            </p>
            <Button onClick={this.handleRetry} size="sm">
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return <div key={this.state.errorKey} className="h-full min-h-0">{this.props.children}</div>
  }
}
