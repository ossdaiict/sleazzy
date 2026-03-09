// @ts-nocheck
import * as React from 'react';
import { type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-borderSoft bg-card p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-semibold text-textPrimary">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-textMuted">
            An unexpected error occurred. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-6 gap-2"
            onClick={this.handleRetry}
          >
            <RefreshCw size={16} />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
