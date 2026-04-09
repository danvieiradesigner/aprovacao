import { useState } from 'react';
import { ApprovalRequest } from '../services/supabase';

interface DataTableProps {
  data: ApprovalRequest[];
  loading?: boolean;
  onRowClick?: (request: ApprovalRequest) => void;
  onReceiptClick?: (request: ApprovalRequest) => void;
  actions?: Array<{
    label: string;
    onClick: (request: ApprovalRequest) => void;
    className?: string;
  }>;
}

export default function DataTable({ data, loading, onRowClick, onReceiptClick, actions }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof ApprovalRequest | null>(null);
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

  const handleSort = (field: keyof ApprovalRequest) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-warning/20 text-warning',
      NEEDS_INFO: 'bg-orange-500/20 text-orange-400',
      APPROVED: 'bg-success/20 text-success',
      REJECTED: 'bg-danger/20 text-danger',
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
      <div className="glass rounded-2xl p-12 border border-border text-center">
        <div className="text-text-muted">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full px-4 py-2 rounded-xl bg-bg-card border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Versão Desktop - Tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-input border-b border-border">
            <tr>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('id_code')}
              >
                ID {sortField === 'id_code' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('numero_referencia' as keyof ApprovalRequest)}
              >
                Cód. Ref. {sortField === 'numero_referencia' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('base')}
              >
                Base {sortField === 'base' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Descrição
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('amount')}
              >
                Valor {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {data[0]?.requester && (
                <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Solicitante
                </th>
              )}
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-brand"
                onClick={() => handleSort('created_at')}
              >
                Criado em {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {onReceiptClick && (
                <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Comprovante
                </th>
              )}
              {actions && actions.length > 0 && (
                <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
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
                  className="border-b border-border hover:bg-bg-input transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(item)}
                >
                  <td className="px-6 py-5 text-sm text-brand font-medium tooltip" title={item.id_code}>
                    {item.id_code}
                  </td>
                  <td className="px-6 py-5 text-sm text-text-primary">
                    {item.numero_referencia ? item.numero_referencia.split(' ')[0] : '-'}
                  </td>
                  <td className="px-6 py-5 text-sm text-text-primary">{item.base}</td>
                  <td className="px-6 py-5 text-sm text-text-primary max-w-md truncate">
                    {item.description}
                  </td>
                  <td className="px-6 py-5 text-sm text-text-primary">
                    R$ {parseFloat(item.amount).toFixed(2)}
                  </td>
                  {item.requester && (
                    <td className="px-6 py-5 text-sm text-text-primary">{item.requester.username}</td>
                  )}
                  <td className="px-6 py-5 text-sm">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-5 text-sm text-text-muted">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </td>
                  {onReceiptClick && (
                    <td className="px-6 py-5 text-sm" onClick={(e) => e.stopPropagation()}>
                      {item.receipt_url ? (
                        <button
                          onClick={() => onReceiptClick(item)}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all no-outline"
                        >
                          Ver Comprovante
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">Sem comprovante</span>
                      )}
                    </td>
                  )}
                  {actions && actions.length > 0 && (
                    <td className="px-6 py-5 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all no-outline ${action.className || 'text-text-muted hover:bg-bg-input'}`}
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

      {/* Versão Mobile - Cards */}
      <div className="md:hidden">
        {sortedData.length === 0 ? (
          <div className="px-4 py-12 text-center text-text-muted">
            Nenhum registro encontrado
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {sortedData.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-bg-input border border-border cursor-pointer hover:bg-bg-card transition-colors"
                onClick={() => onRowClick?.(item)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-brand font-semibold text-lg">{item.id_code}</h3>
                    <p className="text-text-muted text-xs mt-1">Cód: {item.numero_referencia ? item.numero_referencia.split(' ')[0] : '-'} | Base: {item.base}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <p className="text-text-primary text-sm mb-3 line-clamp-2">{item.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-text-muted text-xs">Valor</p>
                    <p className="text-brand font-semibold">
                      R$ {parseFloat(item.amount).toFixed(2)}
                    </p>
                  </div>
                  {item.requester && (
                    <div className="text-right">
                      <p className="text-text-muted text-xs">Solicitante</p>
                      <p className="text-text-primary text-sm">{item.requester.username}</p>
                    </div>
                  )}
                </div>

                <p className="text-text-muted text-xs mb-3">
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </p>

                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {onReceiptClick && item.receipt_url && (
                    <button
                      onClick={() => onReceiptClick(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all no-outline"
                    >
                      Ver Comprovante
                    </button>
                  )}
                  {actions && actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => action.onClick(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all no-outline ${action.className || 'bg-bg-card text-text-primary hover:bg-bg-input'}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

