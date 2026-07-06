import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignApi } from '@/lib/api';
import { Plus, Pencil, Zap, ZapOff, Trash2, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

const emptyForm: FormState = { name: '', description: '', startDate: '', endDate: '' };

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list(),
  });
  const campaigns: Campaign[] = data?.data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['campaigns'] });

  const createMutation = useMutation({
    mutationFn: (d: FormState) => campaignApi.create({ ...d, startDate: new Date(d.startDate).toISOString(), endDate: new Date(d.endDate).toISOString() }),
    onSuccess: () => { toast.success('Campaign created'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create campaign'),
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormState) => campaignApi.update(editing!.id, { ...d, startDate: new Date(d.startDate).toISOString(), endDate: new Date(d.endDate).toISOString() }),
    onSuccess: () => { toast.success('Campaign updated'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => campaignApi.activate(id),
    onSuccess: () => { toast.success('Campaign activated'); invalidate(); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => campaignApi.deactivate(id),
    onSuccess: () => { toast.success('Campaign deactivated'); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignApi.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Cannot delete this campaign'),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? '',
      startDate: new Date(c.startDate).toISOString().slice(0, 16),
      endDate: new Date(c.endDate).toISOString().slice(0, 16),
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) return toast.error('Fill all required fields');
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const handleDelete = (c: Campaign) => {
    if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 page-section">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-primary-400 text-sm mt-0.5">Manage promotional campaigns</p>
        </div>
        <button id="btn-new-campaign" onClick={openCreate} className="btn-primary min-h-[44px]">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-10 h-10 text-primary-700 mx-auto mb-3" />
          <p className="text-white/60 text-sm">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className={`glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 border ${c.active ? 'border-primary-500/30' : 'border-white/5'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold truncate">{c.name}</h3>
                  {c.active && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium flex-shrink-0">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                {c.description && <p className="text-white/40 text-xs truncate mb-1">{c.description}</p>}
                <p className="text-primary-500 text-xs">
                  {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0 mt-3 sm:mt-0 w-full sm:w-auto">
                {c.active ? (
                  <button
                    onClick={() => deactivateMutation.mutate(c.id)}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors min-h-[44px]"
                  >
                    <ZapOff className="w-3.5 h-3.5" /> Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => activateMutation.mutate(c.id)}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors min-h-[44px]"
                  >
                    <Zap className="w-3.5 h-3.5" /> Activate
                  </button>
                )}
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 flex-1 sm:flex-none flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  disabled={c.active}
                  className="p-2 flex-1 sm:flex-none flex items-center justify-center rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="glass rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-glass animate-slide-up sm:animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold text-white mb-6">
              {editing ? 'Edit Campaign' : 'Create Campaign'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-primary-300 mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. DBL 1st Anniversary"
                  className="input-field min-h-[44px]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-primary-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..."
                  className="input-field h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-primary-300 mb-1.5">Start Date *</label>
                  <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="input-field min-h-[44px] w-full" required />
                </div>
                <div>
                  <label className="block text-xs text-primary-300 mb-1.5">End Date *</label>
                  <input type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="input-field min-h-[44px] w-full" required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 sm:py-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm transition-colors min-h-[44px]">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 py-3 sm:py-2.5 min-h-[44px]">
                  {(createMutation.isPending || updateMutation.isPending) ? <LoadingSpinner size="sm" /> : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
