import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the error visible in console so we can pinpoint the exact file/line.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-lg font-semibold">{this.props.title ?? "حدث خطأ"}</div>
          <div className="mt-2 text-sm opacity-80">
            افتح الـ Console عشان تشوف السطر اللي سبب المشكلة.
          </div>
          <pre className="mt-4 max-h-[50vh] overflow-auto rounded-xl bg-black/40 p-3 text-xs leading-relaxed">
            {String(error?.stack ?? error?.message ?? error)}
          </pre>
        </div>
      </div>
    );
  }
}
