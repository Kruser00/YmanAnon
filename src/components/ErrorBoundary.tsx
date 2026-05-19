import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-[#ff9d00] font-mono p-4 text-center">
            <h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest mb-4">CRITICAL SYSTEM FAILURE</h1>
            <p className="mb-6 opacity-80 text-sm md:text-base max-w-lg">The Neural Core encountered an unrecoverable exception. Restart the terminal to restore connection.</p>
            <div className="text-xs opacity-50 bg-black/50 border border-[#ff9d00]/30 p-2 text-left w-full max-w-lg overflow-auto max-h-40 mb-6">
               {this.state.error?.toString()}
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="border border-[#ff9d00] px-6 py-2 uppercase hover:bg-[#ff9d00]/20 transition-colors"
            >
                REBOOT_MATRIX
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}
