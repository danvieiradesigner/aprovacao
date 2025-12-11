import { useState } from 'react';

interface Request {
  id: string;
  id_code: string;
  base: string;
  description: string;
  amount: string;
  status: string;
  created_at: string;
  receipt_url?: string | null;
  requester?: { id: string; username: string };
}

interface DataTableProps {
  data: Request[];
  loading?: boolean;
  onRowClick?: (request: Request) => void;
  onReceiptClick?: (request: Request) => void;
  actions?: Array<{
    label: string;
    onClick: (request: Request) => void;
    className?: string;
  }>;
}

export default function DataTable({ data, loading, onRowClick, onReceiptClick, actions }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof Request | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredData = data.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.id_code.toLowerCase().includes(searchLower) ||
      item.base.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.requester?.username.toLowerCase().includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Request) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500/20 text-yellow-400',
      NEEDS_INFO: 'bg-orange-500/20 text-orange-400',
      APPROVED: 'bg-green-500/20 text-green-400',
      REJECTED: 'bg-red-500/20 text-red-400',
      CANCELED: 'bg-text-muted/20 text-text-muted',
    };
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      NEEDS_INFO: 'Esclarecer',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
      CANCELED: 'Cancelada',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 border border-border-neon text-center">
        <div className="text-text-muted">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border-neon overflow-hidden">
      <div className="p-4 border-b border-border-neon">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-surface-alt border-b border-border-neon">
            <tr>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-text-primary cursor-pointer hover:text-neon-primary"
                onClick={() => handleSort('id_code')}
              >
                Código {sortField === 'id_code' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-text-primary cursor-pointer hover:text-neon-primary"
                onClick={() => handleSort('base')}
              >
                Base {sortField === 'base' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                Descrição
              </th>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-text-primary cursor-pointer hover:text-neon-primary"
                onClick={() => handleSort('amount')}
              >
                Valor {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {data[0]?.requester && (
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Solicitante
                </th>
              )}
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-text-primary cursor-pointer hover:text-neon-primary"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-text-primary cursor-pointer hover:text-neon-primary"
                onClick={() => handleSort('created_at')}
              >
                Criado em {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {onReceiptClick && (
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Comprovante
                </th>
              )}
              {actions && actions.length > 0 && (
                <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={
                    7 + 
                    (data[0]?.requester ? 1 : 0) + 
                    (onReceiptClick ? 1 : 0) +
                    (actions && actions.length > 0 ? 1 : 0)
                  } 
                  className="px-6 py-12 text-center text-text-muted"
                >
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border-neon hover:bg-dark-surface-alt transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(item)}
                >
                  <td className="px-6 py-4 text-neon-primary font-medium">{item.id_code}</td>
                  <td className="px-6 py-4 text-text-primary">{item.base}</td>
                  <td className="px-6 py-4 text-text-primary max-w-md truncate">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-text-primary">
                    R$ {parseFloat(item.amount).toFixed(2)}
                  </td>
                  {item.requester && (
                    <td className="px-6 py-4 text-text-primary">{item.requester.username}</td>
                  )}
                  <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-4 text-text-muted text-sm">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </td>
                  {onReceiptClick && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {item.receipt_url ? (
                        <button
                          onClick={() => onReceiptClick(item)}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                        >
                          Ver Comprovante
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">Sem comprovante</span>
                      )}
                    </td>
                  )}
                  {actions && actions.length > 0 && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${action.className || 'text-text-muted hover:bg-dark-surface-alt'}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

