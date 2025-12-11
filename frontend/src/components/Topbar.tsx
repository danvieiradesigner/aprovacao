import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-dark-surface border-b border-border-neon flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-text-primary">{user?.username}</p>
          <p className="text-xs text-text-muted">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl glass text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

