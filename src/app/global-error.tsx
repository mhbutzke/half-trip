'use client';

/**
 * Global error boundary for root layout errors.
 * This catches errors that `error.tsx` cannot handle,
 * including errors in the root layout itself.
 *
 * Must define its own <html> and <body> since the root layout
 * is not rendered when this component is displayed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          backgroundColor: '#fafafa',
          color: '#1a1a1f',
        }}
      >
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              !
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Ops! Algo deu errado
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.6 }}>
              Encontramos um problema inesperado. Não se preocupe, seus dados estão seguros.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                }}
              >
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444', margin: 0 }}>
                  Detalhes do erro:
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  {error.message}
                </p>
                {error.digest && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tentar novamente
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces root layout, so Next.js Link is unavailable */}
              <a
                href="/"
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Voltar ao início
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
