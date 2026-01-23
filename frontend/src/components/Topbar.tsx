import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-dark-surface border-b border-border-neon flex items-center justify-between px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl glass text-text-muted hover:text-neon-primary hover:bg-dark-surface-alt transition-all no-outline"
        title="Menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-text-primary">{user?.username}</p>
          <p className="text-xs text-text-muted">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl glass text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all no-outline"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

