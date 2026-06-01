import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Result, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    globalThis.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "48px 24px" }}>
          <Result
            status="500"
            title="Oops! Une erreur est survenue"
            subTitle={`${this.state.error?.toString() || "Une erreur inattendue s'est produite."}`}
            extra={[
              <Button
                key="reset"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                Réessayer
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                Recharger la page
              </Button>,
            ]}
          />
          {import.meta.env.DEV && (
            <details style={{ marginTop: "24px", whiteSpace: "pre-wrap", textAlign: "left" }}>
              <summary>Détails de l'erreur (développeur)</summary>
              <code style={{ fontSize: "12px", color: "#d32f2f" }}>
                {this.state.error?.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </code>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}




