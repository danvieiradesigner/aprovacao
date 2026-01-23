import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Clock,
  FileText,
  History,
  Users,
  List,
  X,
} from 'lucide-react';

const menuItems = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/pending', icon: Clock, label: 'Pendentes' },
  { path: '/app/requests', icon: List, label: 'Todas as Solicitações' },
  { path: '/app/reports', icon: FileText, label: 'Relatórios' },
  { path: '/app/history', icon: History, label: 'Histórico' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-dark-surface border-r border-border-neon flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-border-neon flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neon-primary">Alçada</h1>
            <p className="text-sm text-text-muted mt-1">Controle de Aprovação</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-xl hover:bg-dark-surface-alt text-text-muted hover:text-text-primary transition-colors no-outline"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                style={{ outline: 'none', border: 'none' }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all no-outline ${
                    isActive
                      ? 'bg-neon-primary/10 text-neon-primary neon-glow-sm'
                      : 'text-text-muted hover:bg-dark-surface-alt hover:text-text-primary'
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
          
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/app/users"
              onClick={handleLinkClick}
              style={{ outline: 'none', border: 'none' }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all mt-4 no-outline ${
                  isActive
                    ? 'bg-neon-primary/10 text-neon-primary neon-glow-sm'
                    : 'text-text-muted hover:bg-dark-surface-alt hover:text-text-primary'
                }`
              }
            >
              <Users size={20} />
              <span className="font-medium">Usuários</span>
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}

