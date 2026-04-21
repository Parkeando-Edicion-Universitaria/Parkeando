/**
 * Página "No-JavaScript" — Se muestra cuando el navegador tiene JS deshabilitado.
 * IMPORTANTE: Esta página NO debe usar Tailwind ni CSS-in-JS;
 *             usa estilos inline para funcionar sin ningún runtime de JS.
 *
 * Se accede vía el redirect <noscript> en layout.tsx.
 */
import Link from 'next/link';

export default function NoJavaScript() {
  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '1.5rem',
    padding: '2rem 1.5rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const browsers = [
    { icon: '🌐', name: 'Chrome / Edge', steps: 'Ajustes → Privacidad y seguridad → Configuración de sitios → JavaScript → Permitir' },
    { icon: '🦊', name: 'Firefox', steps: 'Preferencias → Privacidad y seguridad → (desactivar bloqueo de JS si está activo)' },
    { icon: '🧭', name: 'Safari', steps: 'Preferencias → Seguridad → Activar JavaScript' },
    { icon: '📱', name: 'Samsung Internet', steps: 'Menú (⋮) → Ajustes → Configuración avanzada → Activar JavaScript' },
  ];

  const LOGO_HTML = (
    <span style={{ display: 'inline-flex', fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-0.02em' }}>
      <span style={{ color: '#E32636' }}>P</span>
      <span style={{ color: '#FF7F00' }}>a</span>
      <span style={{ color: '#FFD700' }}>r</span>
      <span style={{ color: '#0055A4' }}>k</span>
      <span style={{ color: '#00BFFF' }}>e</span>
      <span style={{ color: '#32CD32' }}>a</span>
      <span style={{ color: '#228B22' }}>n</span>
      <span style={{ color: '#FF1493' }}>d</span>
      <span style={{ color: '#800080' }}>o</span>
    </span>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #DA291C 0%, #003580 50%, #00A651 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={cardStyle}>
        {/* Branding */}
        <div style={{ marginBottom: '1.5rem' }}>
          {LOGO_HTML}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Edición Universitaria
        </p>

        <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>

        <h1 style={{ fontSize: '1.4rem', color: '#1a1a2e', fontWeight: 800, marginBottom: '0.75rem' }}>
          JavaScript Requerido
        </h1>
        <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: '1.65', marginBottom: '1.5rem' }}>
          Este juego necesita JavaScript para funcionar.<br />
          Por favor, actívalo en tu navegador y recarga la página.
        </p>

        {/* Instrucciones por navegador */}
        <div style={{ background: '#f8f9ff', border: '1px solid #dbe4ff', borderRadius: '1rem', padding: '1.25rem', textAlign: 'left' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#003580', marginBottom: '0.85rem' }}>
            🔧 Cómo activar JavaScript:
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {browsers.map((b, i) => (
              <li key={b.name} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.5rem 0',
                borderBottom: i < browsers.length - 1 ? '1px solid #eee' : 'none',
                fontSize: '0.82rem',
                color: '#444',
                lineHeight: '1.5',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{b.icon}</span>
                <span><strong>{b.name}:</strong> {b.steps}</span>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#999' }}>
          ¿Ya activaste JavaScript?{' '}
          <Link href="/" style={{ color: '#003580', fontWeight: 700 }}>Recargar página →</Link>
        </p>

        <div style={{
          display: 'inline-block',
          background: '#DA291C',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          borderRadius: '0.3rem',
          padding: '0.2rem 0.5rem',
          marginTop: '1.25rem',
        }}>
          UIP · Universidad Interamericana de Panamá
        </div>
      </div>
    </div>
  );
}
