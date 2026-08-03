import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Global safety net: catches any render error anywhere in the tree and shows
// a friendly fallback instead of an unexplained white screen.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, errorInfo);
    // Fire and forget — never let the report itself break the fallback screen
    try {
      base44.functions.invoke("logClientError", {
        message: error?.message || "Unknown error",
        stack: error?.stack || errorInfo?.componentStack || "",
        page_path: window.location.pathname,
      }).catch(() => {});
    } catch { /* ignore */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-white p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Algo deu errado</h1>
            <p className="text-sm text-gray-500 mb-5">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}