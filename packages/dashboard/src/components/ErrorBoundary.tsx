import { Component, type ReactNode } from "react";
import { ErrorState } from "../theme.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[ClearAgent ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          label={this.state.message}
          action={
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: "" })}
              style={{
                marginTop: 12,
                padding: "8px 20px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#000",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
              }}
            >
              Try again
            </button>
          }
        />
      );
    }
    return this.props.children;
  }
}
