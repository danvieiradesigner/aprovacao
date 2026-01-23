import { useEffect, useState } from 'react';
import { supabase, ApprovalRequest } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import DataTable from '../components/DataTable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    base: '',
    requester: '',
    dateFrom: '',
    dateTo: '',
    min: '',
    max: '',
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          requester:user_profiles!approval_requests_requester_id_fkey(id, username),
          approver:user_profiles!approval_requests_approver_id_fkey(id, username)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.base) {
        query = query.ilike('base', `%${filters.base}%`);
      }

      if (filters.requester) {
        // Filtro por solicitante precisa ser feito no cliente por enquanto
        // ou criar uma view no Supabase
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.min) {
        query = query.gte('amount', parseFloat(filters.min));
      }

      if (filters.max) {
        query = query.lte('amount', parseFloat(filters.max));
      }

      const { data, error } = await query;

      if (error) throw error;

      const requestsWithContactNames = await Promise.all(
        (data || []).map(async (request: any) => {
          if (request.requester_phone) {
            const phoneNumber = request.requester_phone.replace(/[^0-9]/g, '');
            const { data: contact } = await supabase
              .from('contacts')
              .select('name')
              .eq('phone_number', phoneNumber)
              .maybeSingle();
            
            if (contact?.name && request.requester) {
              request.requester.username = contact.name;
            }
          } else if (request.requester_email) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('name')
              .ilike('email', request.requester_email.trim())
              .maybeSingle();
            
            if (contact?.name && request.requester) {
              request.requester.username = contact.name;
            }
          }
          return request;
        })
      );

      // Filtrar por solicitante no cliente (já que é relacionamento)
      let filtered = requestsWithContactNames;
      if (filters.requester) {
        filtered = filtered.filter((r: ApprovalRequest) =>
          r.requester?.username?.toLowerCase().includes(filters.requester.toLowerCase())
        );
      }

      setRequests(filtered);
    } catch (error: any) {
      showToast('Erro ao carregar relatórios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = requests.map((r) => ({
      'Código': r.id_code,
      'Solicitante': r.requester?.username || '-',
      'Base': r.base,
      'Descrição': r.description,
      'Valor': parseFloat(r.amount),
      'Observação': r.note || '',
      'Status': r.status,
      'Criado em': new Date(r.created_at).toLocaleString('pt-BR'),
      'Atualizado em': new Date(r.updated_at).toLocaleString('pt-BR'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

    // Formatação
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'C6F366' } },
      };
    }

    const now = new Date();
    const filename = `relatorio_alcada_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

    XLSX.writeFile(wb, filename);
    showToast('Relatório exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Relatórios</h1>
          <p className="text-text-muted text-sm md:text-base">Filtre e exporte solicitações</p>
        </div>
        <button
          onClick={handleExport}
          disabled={requests.length === 0}
          className="px-4 py-2 rounded-xl glass border border-border-neon text-text-primary hover:bg-dark-surface-alt transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed no-outline w-full sm:w-auto"
        >
          📥 Exportar Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="glass rounded-2xl p-6 border border-border-neon">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="NEEDS_INFO">Esclarecer</option>
              <option value="APPROVED">Aprovada</option>
              <option value="REJECTED">Rejeitada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Base</label>
            <input
              type="text"
              value={filters.base}
              onChange={(e) => setFilters({ ...filters, base: e.target.value })}
              placeholder="Filtrar por base..."
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Solicitante</label>
            <input
              type="text"
              value={filters.requester}
              onChange={(e) => setFilters({ ...filters, requester: e.target.value })}
              placeholder="Filtrar por solicitante..."
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Data Inicial</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Data Final</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary focus:outline-none focus:border-neon-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Valor Mín</label>
              <input
                type="number"
                value={filters.min}
                onChange={(e) => setFilters({ ...filters, min: e.target.value })}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Valor Máx</label>
              <input
                type="number"
                value={filters.max}
                onChange={(e) => setFilters({ ...filters, max: e.target.value })}
                placeholder="999999.99"
                step="0.01"
                className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-border-neon text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable data={requests} loading={loading} />
    </div>
  );
}
