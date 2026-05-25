import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

/**
 * Global UI safety net that prevents white-screen failures when a routed page throws.
 */
class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unexpected application error',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // Keep detailed diagnostics in console for local troubleshooting and production logging hooks.
    console.error('AppErrorBoundary caught an error', { error, componentStack: info.componentStack });
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-neutral-900">Page Rendering Error</h1>
          <p className="mt-2 text-sm text-neutral-700">
            The page could not be rendered. You can reload the application and continue working.
          </p>
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 break-words">
            {this.state.errorMessage}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
