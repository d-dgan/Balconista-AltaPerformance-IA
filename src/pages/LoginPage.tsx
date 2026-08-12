import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';
import { useAuth } from '../contexts/AuthContext';
import './login.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    }
    function onInstalled() {
      setShowInstall(false);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstall(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Preencha e-mail e chave de acesso.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas. Acesso negado.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <ParticleBackground />

      <div className="container">
        <div className="login-section">
          {showInstall && (
            <div id="installContainer" className="install-container">
              <button type="button" className="btn-install-app" onClick={handleInstall}>
                <i className="fas fa-download" /> INSTALAR APLICATIVO
              </button>
            </div>
          )}

          <img src="/logo-tecvancel.png" alt="TecVancel" className="tecvancel-logo-bg" />

          <div className="brand-title">Balconista</div>
          <div className="brand-subtitle">
            PRO <span style={{ color: '#fff' }}>IA</span>
            <span className="by-tecvancel">(by TecVancel)</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Identificação (E-mail)</label>
              <div className="input-wrapper">
                <i className="fas fa-user-astronaut" />
                <input
                  ref={emailRef}
                  type="email"
                  id="email"
                  required
                  placeholder="acesso@farmacia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Chave de Acesso</label>
              <div className="input-wrapper">
                <i className="fas fa-key" />
                <input
                  type="password"
                  id="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="error-message">ERRO: {error}</div>}

            <button
              type="submit"
              className="btn-login"
              disabled={submitting || success}
              style={success ? { background: '#00ff88' } : undefined}
            >
              {success ? 'ACESSO PERMITIDO' : submitting ? 'PROCESSANDO DADOS...' : 'Inicializar Sistema'}
            </button>
          </form>

          <div className="login-footer">TecVancel. &copy; 2026. Todos direitos Reservados</div>
        </div>

        <div className="info-section">
          <div className="grid-overlay" />
          <div className="content-box">
            <div className="scrollable-content">
              <h2 className="info-title">
                <i className="fas fa-layer-group" /> Plataforma Completa para Farmácias
              </h2>

              <p className="info-text">
                O Balconista Pro IA é uma plataforma completa de gestão e crescimento para farmácias: atendimento
                inteligente via WhatsApp/Instagram, geração de materiais de marketing e ferramentas de gestão num
                só lugar.
              </p>

              <div className="feature-box">
                <div className="feature-title">Atendimento Inteligente</div>
                <p className="info-text" style={{ marginBottom: 0 }}>
                  CRM de WhatsApp com IA Copiloto sugerindo respostas em tempo real e um Chat IA especialista em
                  orientação farmacêutica sempre disponível.
                </p>
              </div>

              <div className="feature-box" style={{ borderColor: '#fff' }}>
                <div className="feature-title" style={{ color: '#fff' }}>
                  Ferramentas de Crescimento
                </div>
                <p className="info-text" style={{ marginBottom: 0 }}>
                  Gerador de encartes com IA, painel multi-loja e, em breve, precificação inteligente e análise
                  de potencial da região.
                </p>
              </div>

              <p className="info-text">
                <em>"Uma plataforma só, do atendimento no balcão ao crescimento da sua farmácia."</em>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
