import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/chat/ChatPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AtendimentosPage from './components/AtendimentosPage';
import ContactsPage from './components/ContactsPage';
import CampanhasPage from './components/CampanhasPage';
import AdminPage from './components/AdminPage';
import TreinamentoPage from './components/TreinamentoPage';
import SuperAdminPage from './components/SuperAdminPage';
import AiSettingsPage from './components/AiSettingsPage';
import EncartePage from './components/EncartePage';
import InteractiveTour from './components/InteractiveTour';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import DeletionPage from './components/DeletionPage';
import { Menu } from 'lucide-react';

function AuthenticatedApp() {
  const [activeView, setActiveView] = useState('atendimentos');
  const [initialTicketId, setInitialTicketId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSuperAdmin } = useAuth();

  const handleNavigate = (view: string, ticketId?: string) => {
    setInitialTicketId(ticketId || null);
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat-ia':
        return <ChatPage />;
      case 'atendimentos':
        return <AtendimentosPage initialTicketId={initialTicketId} />;
      case 'contatos':
        return <ContactsPage onNavigate={handleNavigate} />;
      case 'campanhas':
        return <CampanhasPage />;
      case 'admin':
        return <AdminPage />;
      case 'ia-copiloto':
        return <AiSettingsPage />;
      case 'tella':
        return isSuperAdmin ? <SuperAdminPage /> : <AtendimentosPage initialTicketId={initialTicketId} />;
      case 'encarte':
        return <EncartePage onNavigate={handleNavigate} />;
      case 'academy':
        return <TreinamentoPage onNavigate={handleNavigate} />;
      default:
        return <AtendimentosPage initialTicketId={initialTicketId} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-50 dark:bg-void-950 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-void-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-tecvancel.png" alt="Balconista Pro" className="w-[22px] h-[22px] object-contain" />
            <span className="font-bold text-[14px] text-slate-800 dark:text-white tracking-tight">Balconista Pro</span>
          </div>
        </div>
      </header>

      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 flex overflow-hidden lg:h-screen min-h-0 relative">
        {renderView()}
        <InteractiveTour />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/deletion" element={<DeletionPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/*" element={<AuthenticatedApp />} />
      </Route>
    </Routes>
  );
}
