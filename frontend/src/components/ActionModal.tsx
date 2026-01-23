import { useState } from 'react';
import { X } from 'lucide-react';

interface Request {
  id: string;
  id_code: string;
  status: string;
}

interface ActionModalProps {
  type: 'approve' | 'reject' | 'clarify' | 'cancel';
  request: Request;
  onClose: () => void;
  onConfirm: (action: string, message?: string) => void;
}

export default function ActionModal({ type, request, onClose, onConfirm }: ActionModalProps) {
  const [message, setMessage] = useState('');

  const config = {
    approve: {
      title: 'Aprovar Solicitação',
      label: 'Mensagem (opcional)',
      button: 'Aprovar',
      buttonClass: 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400',
      required: false,
    },
    reject: {
      title: 'Rejeitar Solicitação',
      label: 'Mensagem (recomendada)',
      button: 'Rejeitar',
      buttonClass: 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400',
      required: false,
    },
    clarify: {
      title: 'Solicitar Esclarecimento',
      label: 'Mensagem (obrigatória)',
      button: 'Solicitar',
      buttonClass: 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400',
      required: true,
    },
    cancel: {
      title: 'Cancelar Solicitação',
      label: '',
      button: 'Cancelar',
      buttonClass: 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400',
      required: false,
    },
  };

  const currentConfig = config[type];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentConfig.required && !message.trim()) {
      return;
    }
    onConfirm(type, message.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-4 md:p-6 border border-border-neon w-full max-w-md my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-text-primary">{currentConfig.title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-dark-surface-alt text-text-muted hover:text-text-primary transition-colors no-outline"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-text-muted text-sm">
            Solicitação: <span className="text-neon-primary font-medium">{request.id_code}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentConfig.label && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {currentConfig.label}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required={currentConfig.required}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary resize-none"
                placeholder="Digite sua mensagem..."
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              className={`flex-1 py-2 rounded-xl ${currentConfig.buttonClass} text-text-primary font-semibold transition-all hover:neon-glow-sm no-outline w-full sm:w-auto`}
            >
              {currentConfig.button}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl glass border border-border-neon text-text-primary hover:bg-dark-surface-alt transition-all no-outline w-full sm:w-auto"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

