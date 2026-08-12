import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
} from 'lucide-react';
import ImagePicker from '../components/ImagePicker';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';
import { fetchCategoriesList } from '../services/categoriesApi';
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../services/bannersApi';

const emptyForm = {
  bannerName: '',
  categoryId: '',
  isActive: true,
  imageUrl: '',
};

const Banners = () => {
  const { confirm } = useConfirm();
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBanners, setTotalBanners] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBanners();
  }, [page, searchTerm]);

  const loadCategories = async () => {
    try {
      const list = await fetchCategoriesList();
      setCategories(list.filter((c) => c.isActive !== false));
    } catch (err) {
      console.error(err);
    }
  };

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await listBanners({
        page,
        limit: 12,
        q: searchTerm || undefined,
      });
      setBanners(data.banners || []);
      setTotalPages(data.totalPages || 1);
      setTotalBanners(data.totalBanners || 0);
    } catch (err) {
      console.error(err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setCurrent(null);
    setForm(emptyForm);
    setImageFile(null);
    setPreview('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setCurrent(item);
    setForm({
      bannerName: item.bannerName || '',
      categoryId: item.categoryId?._id || item.categoryId || '',
      isActive: item.isActive !== false,
      imageUrl: item.image || '',
    });
    setImageFile(null);
    setPreview(item.image || '');
    setShowModal(true);
  };

  const handleFile = (file) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bannerName.trim()) return;
    if (!imageFile && !form.imageUrl) return;

    try {
      setSaving(true);

      if (imageFile) {
        const fd = new FormData();
        fd.append('bannerName', form.bannerName.trim());
        fd.append('image', imageFile);
        fd.append('isActive', String(form.isActive));
        if (form.categoryId) fd.append('categoryId', form.categoryId);

        if (current) {
          await updateBanner(current._id, fd, true);
        } else {
          await createBanner(fd, true);
        }
      } else {
        const payload = {
          bannerName: form.bannerName.trim(),
          image: form.imageUrl,
          isActive: form.isActive,
        };
        if (form.categoryId) payload.categoryId = form.categoryId;

        if (current) {
          await updateBanner(current._id, payload, false);
        } else {
          await createBanner(payload, false);
        }
      }

      setShowModal(false);
      loadBanners();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete banner?',
      message: 'Delete this banner permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteBanner(id);
      loadBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const categoryName = (item) =>
    item.categoryId?.name || item.category || 'Uncategorized';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">
            Content
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Banners</h1>
          <p className="text-stone-500 mt-1">
            Manage home and campaign banners · {totalBanners} total
          </p>
        </div>
        <button type="button" onClick={openCreate} className="bk-btn px-6 py-3 flex items-center justify-center gap-2">
          <Plus size={20} />
          Add Banner
        </button>
      </div>

      <div className="bk-panel p-4 mb-8">
        <SearchInput
          placeholder="Search banners..."
          value={searchTerm}
          onChange={(e) => {
            setPage(1);
            setSearchTerm(e.target.value);
          }}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bk-panel animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bk-panel">
          <ImageIcon size={40} className="text-brand-300 mb-4" />
          <h3 className="font-display text-2xl font-bold text-ink">No banners found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((item) => (
            <div key={item._id} className="bk-panel overflow-hidden group">
              <div className="aspect-[16/9] bg-sand relative">
                {item.image ? (
                  <img src={item.image} alt={item.bannerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-200">
                    <ImageIcon size={48} />
                  </div>
                )}
                <span
                  className={`absolute top-3 left-3 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                    item.isActive ? 'bg-emerald-500 text-white' : 'bg-stone-500 text-white'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-ink truncate">{item.bannerName}</h4>
                <p className="text-xs text-stone-500 mt-1">{categoryName(item)}</p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="flex-1 py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-sm flex items-center justify-center gap-1 hover:bg-brand-100"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-xl border border-brand-100 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-ink">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-xl border border-brand-100 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-lg rounded-[1.75rem] shadow-2xl overflow-hidden border border-brand-100 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-brand-50 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-ink">
                {current ? 'Edit Banner' : 'Create Banner'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-sand rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-bold text-ink">
                  Banner Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="bk-input mt-1"
                  value={form.bannerName}
                  onChange={(e) => setForm({ ...form, bannerName: e.target.value })}
                  placeholder="Home Hero"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink">Category</label>
                <select
                  className="bk-input mt-1"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <ImagePicker
                required
                previewUrl={preview}
                onFileSelect={handleFile}
                onClear={() => {
                  setImageFile(null);
                  setPreview('');
                  setForm({ ...form, imageUrl: '' });
                }}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brand-500 w-5 h-5"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span className="text-sm font-semibold text-ink">Active</span>
              </label>
            </div>

            <div className="p-6 bg-sand border-t border-brand-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-3 font-bold text-stone-500">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="bk-btn px-8 py-3 flex items-center gap-2">
                <Save size={18} />
                {saving ? 'Saving...' : current ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Banners;
