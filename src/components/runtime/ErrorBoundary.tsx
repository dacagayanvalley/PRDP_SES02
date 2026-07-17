import { Component, type ErrorInfo, type ReactNode } from "react";
import { resetLocalDataset } from "../../data/repositories";

interface Props { children: ReactNode }
interface State { error: Error | null; details: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, details: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, details: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, details: info.componentStack ?? "" });
  }

  resetAndReload = () => {
    resetLocalDataset();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash-screen">
        <section className="panel crash-panel">
          <p className="eyebrow">SES-Track 02 runtime recovery</p>
          <h1>The app hit a browser error before it could render.</h1>
          <p>This screen replaces the blank page so the issue is visible. Try resetting browser-local data first; it will reload the official SIDLAN Region II snapshot.</p>
          <pre className="code-block">{this.state.error.message}{this.state.details ? `\n${this.state.details}` : ""}</pre>
          <div className="template-actions">
            <button onClick={this.resetAndReload}>Reset local data and reload</button>
            <button className="ghost" onClick={() => window.location.reload()}>Reload only</button>
          </div>
        </section>
      </main>
    );
  }
}

