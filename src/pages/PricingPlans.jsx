import React, { useState, useEffect } from 'react';
import { Plus, IndianRupee, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';
import api, { muteToast } from '../services/api';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  durationDays: '',
  badge: '',
  featuresText: '',
  isActive: true,
  sortOrder: 0,
};

const PricingPlans = () => {
  const { confirm } = useConfirm();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/plans', muteToast);
      setPlans(res.data);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setCurrentPlan(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setCurrentPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      badge: plan.badge || '',
      featuresText: (plan.features || []).join('\n'),
      isActive: plan.isActive !== false,
      sortOrder: plan.sortOrder ?? 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        badge: form.badge,
        features: form.featuresText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (currentPlan) {
        await api.put(`/plans/${currentPlan._id}`, payload, { successMessage: 'Plan updated' });
      } else {
        await api.post('/plans', payload, { successMessage: 'Plan created' });
      }

      setShowModal(false);
      fetchPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    const ok = await confirm({
      title: 'Delete plan?',
      message: 'Delete this plan permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/plans/${id}`, { successMessage: 'Plan deleted' });
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = plans.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">Membership</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Pricing Plans</h1>
          <p className="text-stone-500 mt-1">Packages shown in the Karyakarta app after purchase.</p>
        </div>
        <button onClick={openCreate} className="bk-btn px-6 py-3 flex items-center justify-center gap-2">
          <Plus size={20} />
          Add Plan
        </button>
      </div>

      <div className="bk-panel p-4 mb-8">
        <SearchInput
          placeholder="Search plans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bk-panel animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((plan) => (
            <div
              key={plan._id}
              className="bk-panel bk-panel-accent p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-display text-2xl font-bold text-ink">{plan.name}</h3>
                  {plan.badge && (
                    <span className="text-[10px] font-black uppercase bg-brand-100 text-brand-800 px-2 py-1 rounded-lg">
                      {plan.badge}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                      plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-stone-500 text-sm mt-1">{plan.description}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm font-semibold text-ink">
                  <span className="flex items-center gap-1 text-brand-700">
                    <IndianRupee size={14} />
                    {plan.price}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {plan.durationDays} days
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(plan)} className="p-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDeactivate(plan._id)} className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div className="bg-white rounded-[1.75rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-100">
            <div className="flex items-center justify-between p-6 border-b border-brand-50">
              <h2 className="font-display text-2xl font-bold text-ink">{currentPlan ? 'Edit Plan' : 'New Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-sand rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Plan name</label>
                <input required className="bk-input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Description</label>
                <textarea className="bk-input mt-1" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Price (INR)</label>
                  <input required type="number" min="1" className="bk-input mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Duration (days)</label>
                  <input required type="number" min="1" className="bk-input mt-1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Badge</label>
                  <input className="bk-input mt-1" placeholder="45% OFF" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Sort order</label>
                  <input type="number" className="bk-input mt-1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Features (one per line)</label>
                <textarea className="bk-input mt-1" rows={3} value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-brand-500" />
                <span className="text-sm font-semibold text-ink">Visible in mobile app</span>
              </label>
              <button type="submit" disabled={isSubmitting} className="bk-btn w-full py-4 flex items-center justify-center gap-2">
                <Save size={18} />
                {isSubmitting ? 'Saving...' : 'Save Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPlans;
