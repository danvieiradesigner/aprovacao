import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, Bell, Search, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Generate breadcrumbs based on path
  const pathnames = location.pathname.split('/').filter((x) => x && x !== 'app');
  
  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-border flex items-center px-4 md:px-8 justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl hover:bg-bg-input text-text-secondary transition-all"
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-2 text-sm">
          <Link to="/app" className="text-text-secondary hover:text-brand transition-colors">Workspace</Link>
          {pathnames.map((name, index) => {
            const routeTo = `/app/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);

            return (
              <div key={name} className="flex items-center gap-2">
                <ChevronRight size={14} className="text-text-muted" />
                {isLast ? (
                  <span className="font-semibold text-text-primary">{displayName}</span>
                ) : (
                  <Link to={routeTo} className="text-text-secondary hover:text-brand transition-colors">
                    {displayName}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search Placeholder */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-input/50 border border-border text-text-muted cursor-pointer hover:border-brand/30 transition-colors">
          <Search size={16} />
          <span className="text-xs pr-8">Pesquisar...</span>
          <span className="text-[10px] bg-bg-sidebar px-1.5 py-0.5 rounded border border-border">⌘K</span>
        </div>

        <button className="p-2 rounded-xl hover:bg-bg-input text-text-secondary transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-bg-dark"></span>
        </button>

        <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-text-primary leading-none">{user?.username}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-tighter mt-1">{user?.role}</p>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-danger/10 text-text-secondary hover:text-red-500 transition-all"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}


