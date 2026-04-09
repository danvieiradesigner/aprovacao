import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Clock,
  FileText,
  History,
  Users,
  X,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  path: string;
  icon: any;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { id: 'pending', label: 'Pendentes', path: '/app/pending', icon: Clock },
    { id: 'requests', label: 'Todas as Solicitações', path: '/app/requests', icon: FileText },
    { id: 'reports', label: 'Relatórios', path: '/app/reports', icon: FileText },
    { id: 'history', label: 'Histórico', path: '/app/history', icon: History },
    ...(user?.role === 'ADMIN'
      ? [{ id: 'users', label: 'Usuários', path: '/app/users', icon: Users }]
      : []),
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex].path);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-16 md:pt-32 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full max-w-2xl p-2 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos..."
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-input text-text-muted hover:text-text-primary no-outline"
          >
            <X size={20} />
          </button>
        </div>
        <div className="py-2 max-h-96 overflow-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted">
              Nenhum comando encontrado
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all no-outline ${
                    index === selectedIndex
                      ? 'bg-brand/10 text-brand'
                      : 'text-text-muted hover:bg-bg-input hover:text-text-primary'
                  }`}
                >
                  <Icon size={20} />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

