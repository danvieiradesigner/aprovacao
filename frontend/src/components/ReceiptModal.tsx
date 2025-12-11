import { X } from 'lucide-react';

interface ReceiptModalProps {
  receiptUrl: string;
  onClose: () => void;
}

export default function ReceiptModal({ receiptUrl, onClose }: ReceiptModalProps) {
  // Converter link do Google Drive para visualização direta
  const getViewableUrl = (url: string) => {
    // Se já for um link de visualização, retorna como está
    if (url.includes('/view') || url.includes('/preview')) {
      return url;
    }
    
    // Se for um link de compartilhamento do Drive, converte para visualização
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    
    // Se não conseguir converter, retorna o URL original
    return url;
  };

  const viewableUrl = getViewableUrl(receiptUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 glass rounded-2xl border border-border-neon overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-neon">
          <h2 className="text-xl font-bold text-text-primary">Comprovante</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              src={viewableUrl}
              className="w-full h-full min-h-[600px] border border-border-neon rounded-lg"
              title="Comprovante"
              allow="fullscreen"
            />
          </div>
          
          <div className="mt-4 text-center">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-primary hover:text-neon-secondary transition-colors underline"
            >
              Abrir em nova aba
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

