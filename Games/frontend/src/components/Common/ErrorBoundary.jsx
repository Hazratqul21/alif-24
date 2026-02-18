import React from 'react';

/**
 * ErrorBoundary
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="error-boundary-fallback" style={{
                    padding: '40px',
                    textAlign: 'center',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#ffffff'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Kutilmagan xatolik yuz berdi</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                        Iltimos, sahifani yangilab ko'ring yoki keyinroq urinib ko'ring.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#4e73df',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500'
                        }}
                    >
                        Sahifani yangilash
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', textAlign: 'left', maxWidth: '80%' }}>
                            {this.state.error && this.state.error.toString()}
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
