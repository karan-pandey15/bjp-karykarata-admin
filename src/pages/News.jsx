import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
} from 'lucide-react';
import ImagePicker from '../components/ImagePicker';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';
import { listNews, createNews, updateNews, deleteNews } from '../services/newsApi';

const emptyForm = {
  newsHeading: '',
  subHeading: '',
  newsDescription: '',
  isActive: true,
  imageUrl: '',
};

const News = () => {
  const { confirm } = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNews, setTotalNews] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNews();
  }, [page, searchTerm]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await listNews({
        page,
        limit: 10,
        q: searchTerm || undefined,
      });
      setItems(data.news || []);
      setTotalPages(data.totalPages || 1);
      setTotalNews(data.totalNews || 0);
    } catch (err) {
      console.error(err);
      setItems([]);
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
      newsHeading: item.newsHeading || '',
      subHeading: item.subHeading || '',
      newsDescription: item.newsDescription || '',
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
    if (!form.newsHeading.trim() || !form.subHeading.trim() || !form.newsDescription.trim()) return;
    if (!imageFile && !form.imageUrl) return;

    try {
      setSaving(true);

      if (imageFile) {
        const fd = new FormData();
        fd.append('newsHeading', form.newsHeading.trim());
        fd.append('subHeading', form.subHeading.trim());
        fd.append('newsDescription', form.newsDescription.trim());
        fd.append('image', imageFile);
        fd.append('isActive', String(form.isActive));

        if (current) {
          await updateNews(current._id, fd, true);
        } else {
          await createNews(fd, true);
        }
      } else {
        const payload = {
          newsHeading: form.newsHeading.trim(),
          subHeading: form.subHeading.trim(),
          newsDescription: form.newsDescription.trim(),
          image: form.imageUrl,
          isActive: form.isActive,
        };

        if (current) {
          await updateNews(current._id, payload, false);
        } else {
          await createNews(payload, false);
        }
      }

      setShowModal(false);
      loadNews();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete news?',
      message: 'Delete this news item permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteNews(id);
      loadNews();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">
            Content
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">News</h1>
          <p className="text-stone-500 mt-1">
            Publish updates for the Karyakarta app · {totalNews} total
          </p>
        </div>
        <button type="button" onClick={openCreate} className="bk-btn px-6 py-3 flex items-center justify-center gap-2">
          <Plus size={20} />
          Add News
        </button>
      </div>

      <div className="bk-panel p-4 mb-8">
        <SearchInput
          placeholder="Search news..."
          value={searchTerm}
          onChange={(e) => {
            setPage(1);
            setSearchTerm(e.target.value);
          }}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bk-panel animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bk-panel">
          <Newspaper size={40} className="text-brand-300 mb-4" />
          <h3 className="font-display text-2xl font-bold text-ink">No news found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bk-panel bk-panel-accent p-4 flex flex-col sm:flex-row gap-4"
            >
              <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden bg-sand shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.newsHeading} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-200">
                    <Newspaper size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-ink truncate">{item.newsHeading}</h4>
                    <p className="text-sm text-brand-700 font-semibold mt-0.5">{item.subHeading}</p>
                    <p className="text-xs text-stone-500 mt-2 line-clamp-2">{item.newsDescription}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                      item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-sm flex items-center gap-1 hover:bg-brand-100"
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
                {current ? 'Edit News' : 'Create News'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-sand rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-bold text-ink">
                  News Heading <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="bk-input mt-1"
                  value={form.newsHeading}
                  onChange={(e) => setForm({ ...form, newsHeading: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink">
                  Sub Heading <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="bk-input mt-1"
                  value={form.subHeading}
                  onChange={(e) => setForm({ ...form, subHeading: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  className="bk-input mt-1 resize-none"
                  value={form.newsDescription}
                  onChange={(e) => setForm({ ...form, newsDescription: e.target.value })}
                />
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

export default News;
