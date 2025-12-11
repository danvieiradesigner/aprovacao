import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Clock,
  FileText,
  History,
  Users,
  List,
} from 'lucide-react';

const menuItems = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/pending', icon: Clock, label: 'Pendentes' },
  { path: '/app/requests', icon: List, label: 'Todas as Solicitações' },
  { path: '/app/reports', icon: FileText, label: 'Relatórios' },
  { path: '/app/history', icon: History, label: 'Histórico' },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-dark-surface border-r border-border-neon flex flex-col">
      <div className="p-6 border-b border-border-neon">
        <h1 className="text-xl font-bold text-neon-primary">Alçada</h1>
        <p className="text-sm text-text-muted mt-1">Controle de Aprovação</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-neon-primary/10 text-neon-primary neon-glow-sm border border-neon-primary/30'
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
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all mt-4 ${
                isActive
                  ? 'bg-neon-primary/10 text-neon-primary neon-glow-sm border border-neon-primary/30'
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
  );
}

