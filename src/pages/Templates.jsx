import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutTemplate, Edit2, Trash2, Smartphone, Image as ImageIcon } from 'lucide-react';
import api, { muteToast } from '../services/api';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';

const Templates = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates', muteToast);
      setTemplates(response.data.templates || response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    const ok = await confirm({
      title: 'Delete template?',
      message: 'Delete this template permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/templates/${id}`, { successMessage: 'Template deleted' });
      setTemplates(templates.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const canvasSizes = [
    { id: 'post', name: 'Instagram Post', size: '1080 x 1080', icon: <LayoutTemplate size={24} /> },
    { id: 'story', name: 'Instagram Story', size: '1080 x 1920', icon: <Smartphone size={24} /> },
    { id: 'portrait', name: 'Instagram Portrait', size: '1080 x 1350', icon: <LayoutTemplate size={24} /> },
    { id: 'fb_post', name: 'Facebook Post', size: '1200 x 630', icon: <LayoutTemplate size={24} /> },
    { id: 'banner', name: 'Facebook Cover', size: '820 x 312', icon: <ImageIcon size={24} /> },
    { id: 'twitter', name: 'Twitter/X Post', size: '1200 x 675', icon: <LayoutTemplate size={24} /> },
    { id: 'youtube', name: 'YouTube Thumbnail', size: '1280 x 720', icon: <LayoutTemplate size={24} /> },
    { id: 'linkedin', name: 'LinkedIn Banner', size: '1584 x 396', icon: <LayoutTemplate size={24} /> },
  ];

  const handleCreate = (sizeId) => {
    if (sizeId === 'custom') {
      navigate(`/templates/create?type=custom&w=${customW}&h=${customH}`);
    } else {
      navigate(`/templates/create?type=${sizeId}`);
    }
  };

  const filtered = templates.filter((t) =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">
            Creative Studio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Campaign Templates</h1>
          <p className="text-stone-500 mt-1">Design posters and creatives for karyakarta outreach.</p>
        </div>
        <button onClick={() => setShowSizeModal(true)} className="bk-btn px-6 py-3 flex items-center justify-center gap-2">
          <Plus size={20} />
          New Template
        </button>
      </div>

      <div className="bk-panel p-4 mb-8">
        <SearchInput
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/5] bk-panel animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bk-panel border-dashed">
          <LayoutTemplate size={40} className="text-brand-300 mb-4" />
          <h3 className="font-display text-2xl font-bold text-ink">No templates found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((template) => (
            <div
              key={template._id}
              className="group bk-panel overflow-hidden hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300"
            >
              {template.type === 'BRAND_KIT' && (
                <div className="absolute top-4 left-4 z-10 bg-brand-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                  Brand Kit
                </div>
              )}
              <div
                className="relative aspect-[4/5] bg-sand overflow-hidden cursor-pointer"
                onClick={() => navigate(`/templates/edit/${template._id}`)}
              >
                {template.imageUrl ? (
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-200">
                    <LayoutTemplate size={72} />
                  </div>
                )}
                <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/templates/edit/${template._id}`);
                    }}
                    className="p-3 bg-white text-ink rounded-full shadow-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-brand-50">
                <h4 className="font-bold text-ink truncate">{template.name}</h4>
                <div className="flex items-center justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <span>{template.ratio || 'Custom'}</span>
                  <button onClick={() => deleteTemplate(template._id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-md" onClick={() => setShowSizeModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[1.75rem] shadow-2xl overflow-hidden border border-brand-100">
            <div className="p-8 pb-0">
              <h2 className="font-display text-3xl font-bold text-ink mb-2">Choose Canvas Size</h2>
              <p className="text-stone-500 mb-6">Pick a preset or enter custom dimensions.</p>
            </div>

            <div className="px-8 pb-8 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {canvasSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleCreate(size.id)}
                    className="flex flex-col items-start p-5 rounded-2xl border-2 border-brand-50 hover:border-brand-500 bg-sand hover:bg-white transition-all text-left"
                  >
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-brand-600 shadow-sm mb-3">
                      {size.icon}
                    </div>
                    <h5 className="font-bold text-ink text-sm">{size.name}</h5>
                    <p className="text-[10px] text-stone-500 mt-1">{size.size}</p>
                  </button>
                ))}
              </div>

              <div className="mt-8 border-t border-brand-50 pt-6">
                <button
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${
                    isCustomMode ? 'bg-brand-500 text-white' : 'bg-sand text-ink hover:bg-brand-50'
                  }`}
                >
                  <Plus size={20} />
                  Custom Dimensions
                </button>

                {isCustomMode && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Width</label>
                      <input
                        type="number"
                        value={customW}
                        onChange={(e) => setCustomW(Math.min(4000, Math.max(100, parseInt(e.target.value) || 100)))}
                        className="bk-input mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Height</label>
                      <input
                        type="number"
                        value={customH}
                        onChange={(e) => setCustomH(Math.min(4000, Math.max(100, parseInt(e.target.value) || 100)))}
                        className="bk-input mt-1 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-sand flex justify-between items-center border-t border-brand-50">
              <button onClick={() => setShowSizeModal(false)} className="text-stone-500 font-bold hover:text-ink">
                Cancel
              </button>
              <button onClick={() => handleCreate('custom')} className="bk-btn px-8 py-3">
                Start Designing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
