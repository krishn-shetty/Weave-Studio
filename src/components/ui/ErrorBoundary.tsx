import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangleIcon, RotateCcwIcon, ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-8 max-w-xl rounded-xl border border-danger/30 bg-surface p-6 shadow-panel">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
              <AlertTriangleIcon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-ink">
                {this.props.fallbackTitle ?? 'Something unexpected went wrong'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {this.state.error?.message || 'An error occurred while rendering this component.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={this.handleReset}>
                  <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
                  Try again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/agents';
                  }}
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
                  Back to agents
                </Button>
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                >
                  {this.state.showDetails ? (
                    <>
                      Hide details <ChevronUpIcon className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      View details <ChevronDownIcon className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              {this.state.showDetails && (
                <div className="mt-4 rounded-lg bg-canvas p-3 font-mono text-xs text-ink-soft overflow-x-auto border border-line">
                  <p className="font-semibold text-danger">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[11px] leading-relaxed opacity-80 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
