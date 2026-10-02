import { Component } from 'react';

/**
 * GlobalErrorBoundary
 *
 * Catches React render/lifecycle errors and provides:
 *
 * 1. CHUNK LOAD ERROR (stale cached chunks after a new Vercel deployment)
 *    → Automatically reloads ONCE (guarded by sessionStorage to prevent loop)
 *    → If auto-reload already happened and error persists, shows manual button
 *
 * 2. REGULAR RENDER ERROR (TypeError, ReferenceError, etc.)
 *    → Shows "Something went wrong" + [Reload] button
 *    → Does NOT show "Updating OneCoolie" — that message is only for chunk errors
 *
 * SAFETY GUARANTEES:
 * - Never reloads more than once automatically (sessionStorage guard)
 * - Never shows a blank white page
 * - Never masks or discards real errors (logs full details to console)
 * - Clearing the flag on successful mount (via static clearChunkReloadFlag)
 *   ensures next real chunk error gets an auto-reload attempt
 */

const CHUNK_RELOAD_FLAG = 'oc_chunk_reload_v1';

function isChunkLoadError(error) {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('error loading dynamically imported module') ||
    error.message?.includes('Importing a module script failed') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Loading CSS chunk')
  );
}

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      isChunkError: false,
      chunkAutoReloadFired: false,
      errorMessage: ''
    };
    this.handleReload = this.handleReload.bind(this);
  }

  /**
   * Call this from a child useEffect on successful mount to clear the
   * chunk-reload flag so the next real chunk error gets an auto-reload.
   */
  static clearChunkReloadFlag() {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    } catch (_) {}
  }

  static getDerivedStateFromError(error) {
    const chunkError = isChunkLoadError(error);

    // Log immediately for debugging — no secrets exposed
    console.error('[OneCoolie ErrorBoundary] Caught error:', {
      name: error?.name,
      message: error?.message,
      isChunkError: chunkError
    });

    if (chunkError) {
      // Guard: only auto-reload once per session to prevent infinite loops
      let alreadyAttempted = false;
      try {
        alreadyAttempted = Boolean(sessionStorage.getItem(CHUNK_RELOAD_FLAG));
      } catch (_) {}

      if (!alreadyAttempted) {
        // Mark that we attempted auto-reload BEFORE triggering it
        try {
          sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
        } catch (_) {}
        // Defer reload slightly so React can finish its error handling
        setTimeout(() => window.location.reload(), 100);
        return {
          hasError: true,
          isChunkError: true,
          chunkAutoReloadFired: true,
          errorMessage: error?.message || ''
        };
      }

      // Auto-reload already happened and we still have a chunk error
      // → Show manual reload UI (not infinite loop)
      return {
        hasError: true,
        isChunkError: true,
        chunkAutoReloadFired: false,
        errorMessage: error?.message || ''
      };
    }

    // Regular render error (TypeError, ReferenceError, etc.)
    return {
      hasError: true,
      isChunkError: false,
      chunkAutoReloadFired: false,
      errorMessage: error?.message || 'An unexpected error occurred.'
    };
  }

  componentDidCatch(error, info) {
    console.error('[OneCoolie ErrorBoundary] Full error details:', error);
    console.error('[OneCoolie ErrorBoundary] Component stack:', info?.componentStack);
  }

  handleReload() {
    // Clear chunk flag so next attempt gets auto-reload again
    GlobalErrorBoundary.clearChunkReloadFlag();
    this.setState({
      hasError: false,
      isChunkError: false,
      chunkAutoReloadFired: false,
      errorMessage: ''
    });
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { isChunkError, chunkAutoReloadFired, errorMessage } = this.state;

    // ── CHUNK ERROR: auto-reload in progress ──
    if (isChunkError && chunkAutoReloadFired) {
      return (
        <div style={styles.page}>
          <div style={styles.card}>
            <div style={{ ...styles.icon, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              🔄
            </div>
            <h1 style={styles.heading}>Applying Update…</h1>
            <p style={styles.body}>
              A new version of OneCoolie is available. Reloading to apply the update.
            </p>
            <p style={styles.hint}>This should only take a moment.</p>
          </div>
        </div>
      );
    }

    // ── CHUNK ERROR: auto-reload already tried, still failing ──
    if (isChunkError && !chunkAutoReloadFired) {
      return (
        <div style={styles.page}>
          <div style={styles.card}>
            <div style={{ ...styles.icon, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              📦
            </div>
            <h1 style={styles.heading}>Update Available</h1>
            <p style={styles.body}>
              A new version of OneCoolie was deployed. Please reload to continue.
            </p>
            <button onClick={this.handleReload} style={styles.button}>
              Reload Now
            </button>
            <p style={styles.hint}>
              If this keeps happening, try clearing your browser cache (Ctrl+Shift+R).
            </p>
          </div>
        </div>
      );
    }

    // ── REGULAR ERROR: something in the app crashed ──
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.icon, background: '#FFF1F2', border: '1px solid #FECDD3' }}>
            ⚠️
          </div>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.body}>
            The application encountered an unexpected error. This has been logged automatically.
          </p>
          {errorMessage && (
            <p style={styles.errorCode}>{errorMessage}</p>
          )}
          <button onClick={this.handleReload} style={styles.button}>
            Reload Application
          </button>
          <p style={styles.hint}>
            If this keeps happening, please contact OneCoolie support.
          </p>
        </div>
      </div>
    );
  }
}

// Inline styles — no Tailwind/CSS dependency so ErrorBoundary always renders
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#F6F8FB',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    textAlign: 'center'
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px 32px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    border: '1px solid #E2E8F0'
  },
  icon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '24px'
  },
  heading: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#18181B',
    marginBottom: '8px',
    marginTop: 0,
    letterSpacing: '-0.3px'
  },
  body: {
    fontSize: '13px',
    color: '#71717A',
    lineHeight: '1.6',
    marginBottom: '8px',
    marginTop: 0
  },
  errorCode: {
    fontSize: '11px',
    color: '#A1A1AA',
    fontFamily: 'monospace',
    background: '#F4F4F5',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '20px',
    wordBreak: 'break-word',
    textAlign: 'left'
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: '9999px',
    background: '#18181B',
    color: 'white',
    fontWeight: '700',
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.2px',
    marginBottom: '12px'
  },
  hint: {
    fontSize: '11px',
    color: '#A1A1AA',
    marginTop: '4px',
    marginBottom: 0
  }
};
