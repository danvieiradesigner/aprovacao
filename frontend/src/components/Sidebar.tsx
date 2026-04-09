import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  FileText,
  History,
  Users,
  List,
  X,
  LogOut,
  ChevronRight
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
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50
          w-72 h-screen bg-bg-sidebar border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="p-8">
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-brand">
              <LayoutDashboard className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Alçada</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-8 right-4 md:hidden p-2 rounded-xl hover:bg-bg-input text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Menu Principal</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-input/50'
                  }`
                }
              >
                <Icon size={20} className={isActive ? 'text-brand' : 'text-text-secondary transition-colors'} />
                <span className="font-medium flex-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 w-1 h-6 bg-brand rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
          
          {user?.role === 'ADMIN' && (
            <>
              <div className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Administração</div>
              <NavLink
                to="/app/users"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-input/50'
                  }`
                }
              >
                <Users size={20} className={location.pathname === '/app/users' ? 'text-brand' : 'text-text-secondary transition-colors'} />
                <span className="font-medium flex-1">Usuários</span>
                {location.pathname === '/app/users' && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 w-1 h-6 bg-brand rounded-r-full"
                  />
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 mt-auto">
          <div className="p-4 rounded-2xl bg-bg-card/50 border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{user?.username}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.role}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


