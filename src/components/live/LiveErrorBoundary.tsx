import { Component, ReactNode, ErrorInfo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class LiveErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Import error utils dynamically to avoid circular deps
    import('@/shared/errors/err-utils').then(({ normalizeError, safeStringify }) => {
      const normalized = normalizeError(error, {
        componentStack: errorInfo.componentStack
      });
      console.error('[LiveErrorBoundary]', safeStringify(normalized));
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Alert className="max-w-md mx-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Live System Error</AlertTitle>
            <AlertDescription className="mt-2 mb-4">
              The live streaming system encountered an error. You can try to recover or reload the page.
            </AlertDescription>
            <div className="flex gap-2">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                Try Again
              </Button>
              <Button 
                onClick={this.handleReload}
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}