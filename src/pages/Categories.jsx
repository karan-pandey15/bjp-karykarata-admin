import React, { useState, useEffect } from 'react';
import { Plus, Tags, Edit2, Trash2, FolderOpen, Save } from 'lucide-react';
import api from '../services/api';
import { fetchCategoriesList } from '../services/categoriesApi';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';

const Categories = () => {
  const { confirm } = useConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const list = await fetchCategoriesList();
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const data = { name };
      if (currentCategory) {
        await api.put(`/categories/${currentCategory._id}`, data, {
          successMessage: 'Category updated',
        });
      } else {
        await api.post('/categories', data, { successMessage: 'Category created' });
      }
      setShowModal(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete category?',
      message: 'Delete this category? Templates using it may block deletion.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/categories/${id}`, { successMessage: 'Category deleted' });
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const openEdit = (cat) => {
    setCurrentCategory(cat);
    setName(cat.name);
    setShowModal(true);
  };

  const resetForm = () => {
    setCurrentCategory(null);
    setName('');
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">Library</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Categories</h1>
          <p className="text-stone-500 mt-1">Organize festival, scheme and political creatives.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bk-btn px-6 py-3 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Create Category
        </button>
      </div>

      <div className="bk-panel p-4 mb-8">
        <SearchInput
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bk-panel animate-pulse" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bk-panel">
          <Tags size={40} className="text-brand-300 mb-4" />
          <h3 className="font-display text-2xl font-bold text-ink">No categories found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((category) => (
            <div
              key={category._id}
              className="group bk-panel bk-panel-accent p-6 hover:shadow-xl hover:shadow-brand-500/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                  <FolderOpen size={24} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(category)}
                    className="p-2 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(category._id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h4 className="font-display text-xl font-bold text-ink truncate mt-4">{category.name}</h4>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-lg rounded-[1.75rem] shadow-2xl overflow-hidden border border-brand-100">
            <div className="p-8">
              <h2 className="font-display text-3xl font-bold text-ink mb-2">
                {currentCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <p className="text-stone-500 mb-6">Name this collection for template filtering.</p>
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Category Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Political, Festivals..."
                className="bk-input mt-1 font-bold"
              />
            </div>
            <div className="p-6 bg-sand flex justify-between items-center border-t border-brand-50">
              <button type="button" onClick={() => setShowModal(false)} className="text-stone-500 font-bold hover:text-ink px-4">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="bk-btn px-8 py-3 flex items-center gap-2">
                <Save size={18} />
                {isSubmitting ? 'Saving...' : currentCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Categories;
