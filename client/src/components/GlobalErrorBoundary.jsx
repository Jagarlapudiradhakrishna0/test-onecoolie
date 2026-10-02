import { Component } from 'react';

/**
 * GlobalErrorBoundary
 *
 * Catches any React render/lifecycle error that would otherwise
 * produce a blank white page. Shows a minimal, actionable error
 * screen with a Reload button. Does NOT mask or swallow errors —
 * it logs them to the console for debugging.
 */
export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
      errorStack: error?.stack || ''
    };
  }

  componentDidCatch(error, info) {
    // Log full details for debugging — no secrets exposed
    console.error('[OneCoolie ErrorBoundary] Uncaught render error:', error);
    console.error('[OneCoolie ErrorBoundary] Component stack:', info?.componentStack);
  }

  handleReload() {
    // Clear error state first, then reload
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#F6F8FB',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px 32px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: '1px solid #E2E8F0'
          }}
        >
          {/* OneCoolie wordmark */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: '900',
              color: '#1463FF',
              letterSpacing: '-0.5px',
              marginBottom: '24px'
            }}
          >
            OneCoolie
          </div>

          {/* Error icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px'
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              fontSize: '18px',
              fontWeight: '800',
              color: '#18181B',
              marginBottom: '8px',
              letterSpacing: '-0.3px'
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#71717A',
              lineHeight: '1.5',
              marginBottom: '8px'
            }}
          >
            The application encountered an unexpected error. This has been logged automatically.
          </p>

          {/* Show short error message in production for context */}
          {this.state.errorMessage && (
            <p
              style={{
                fontSize: '11px',
                color: '#A1A1AA',
                fontFamily: 'monospace',
                background: '#F4F4F5',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '24px',
                wordBreak: 'break-word'
              }}
            >
              {this.state.errorMessage}
            </p>
          )}

          <button
            onClick={this.handleReload}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '9999px',
              background: '#18181B',
              color: 'white',
              fontWeight: '700',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.2px'
            }}
          >
            Reload Application
          </button>

          <p
            style={{
              fontSize: '11px',
              color: '#A1A1AA',
              marginTop: '16px'
            }}
          >
            If this keeps happening, please contact OneCoolie support.
          </p>
        </div>
      </div>
    );
  }
}
