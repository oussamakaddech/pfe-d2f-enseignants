import React from "react";
import { Result, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

/**
 * Error Boundary Component
 * Catches errors in child components and displays a user-friendly error page
 * instead of crashing the entire application.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
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
          {process.env.NODE_ENV === "development" && (
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




