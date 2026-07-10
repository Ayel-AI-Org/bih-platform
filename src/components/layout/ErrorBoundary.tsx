import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // This logs the precise component stack trace alongside the runtime error
    console.error("Uncaught application error:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-xl p-6 text-center space-y-6">
            
            {/* Warning Icon Graphic */}
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            {/* Context Messages */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected application error occurred. We have logged this diagnostic incident.
              </p>
            </div>
            
            {/* Debugging Log Terminal Container */}
            {this.state.error && (
              <div className="bg-slate-100 p-3 rounded-lg text-left text-[10px] font-mono text-slate-600 max-h-32 overflow-y-auto break-all">
                {this.state.error.toString()}
              </div>
            )}
            
            {/* Interactive Fallback Interactive Trigger */}
            <Button
              onClick={this.handleReset}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Go to Safety (Home)
            </Button>
            
          </div>
        </div>
      );
    }

    // Safely reads from the typed class properties execution context
    return this.props.children;
  }
}

export default ErrorBoundary;