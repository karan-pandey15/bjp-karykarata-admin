import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Video,
  Edit2,
  Trash2,
  Smartphone,
  Square,
  MonitorPlay,
  Clapperboard,
  PlayCircle,
  Download,
} from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { useConfirm } from '../context/ConfirmContext';
import {
  listVideoTemplates,
  deleteVideoTemplate,
  listCompositions,
} from '../services/videoTemplatesApi';

const ASPECT_PRESETS = [
  {
    id: '9:16',
    name: 'Story / Reels',
    size: '1080 × 1920',
    w: 1080,
    h: 1920,
    icon: Smartphone,
  },
  {
    id: '1:1',
    name: 'Square Post',
    size: '1080 × 1080',
    w: 1080,
    h: 1080,
    icon: Square,
  },
  {
    id: '16:9',
    name: 'Landscape / YouTube',
    size: '1920 × 1080',
    w: 1920,
    h: 1080,
    icon: MonitorPlay,
  },
];

const VideoTemplates = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1920);
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [listRes, compsRes] = await Promise.all([
        listVideoTemplates({ limit: 100 }).catch(() => null),
        listCompositions({ limit: 50 }).catch(() => null),
      ]);
      setTemplates(listRes?.videoTemplates || (Array.isArray(listRes) ? listRes : []));
      setCompositions(compsRes?.compositions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    const ok = await confirm({
      title: 'Delete video template?',
      message: 'Delete this video frame template permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteVideoTemplate(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = (preset) => {
    if (preset === 'custom') {
      navigate(
        `/video-templates/create?ratio=custom&w=${customW}&h=${customH}`
      );
    } else {
      navigate(
        `/video-templates/create?ratio=${encodeURIComponent(preset.id)}&w=${preset.w}&h=${preset.h}`
      );
    }
    setShowSizeModal(false);
  };

  const filtered = templates.filter((t) =>
    `${t.name || ''} ${t.description || ''} ${t.category || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">
            Creative Studio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">
            Video Templates
          </h1>
          <p className="text-stone-500 mt-1">
            Canva-style frames — place a video slot, overlay, text, then merge & export.
          </p>
        </div>
        <button
          onClick={() => setShowSizeModal(true)}
          className="bk-btn px-6 py-3 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          New Video Template
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === 'templates'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
              : 'bg-white text-stone-600 border border-brand-100'
          }`}
        >
          Templates ({templates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('compositions')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === 'compositions'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
              : 'bg-white text-stone-600 border border-brand-100'
          }`}
        >
          Merged Videos ({compositions.length})
        </button>
      </div>

      {tab === 'templates' && (
        <>
          <div className="bk-panel p-4 mb-8">
            <SearchInput
              placeholder="Search video templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[9/14] bk-panel animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bk-panel border-dashed">
              <Clapperboard size={40} className="text-brand-300 mb-4" />
              <h3 className="font-display text-2xl font-bold text-ink">No video templates yet</h3>
              <p className="text-stone-500 mt-2 text-sm">Create a Canva-style frame to get started.</p>
              <button onClick={() => setShowSizeModal(true)} className="bk-btn px-6 py-3 mt-6 flex items-center gap-2">
                <Plus size={18} />
                New Video Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((template) => (
                <div
                  key={template._id}
                  className="group bk-panel overflow-hidden hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300"
                >
                  <div
                    className="relative aspect-[9/14] bg-sand overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/video-templates/edit/${template._id}`)}
                  >
                    {template.thumbnailUrl || template.frameOverlayUrl ? (
                      <img
                        src={template.thumbnailUrl || template.frameOverlayUrl}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-200">
                        <Video size={64} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="bg-ink/80 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                        {template.aspectRatio || `${template.canvasWidth}×${template.canvasHeight}`}
                      </span>
                      {template.isActive === false && (
                        <span className="bg-stone-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                          Off
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/video-templates/edit/${template._id}`);
                        }}
                        className="p-3 bg-white text-ink rounded-full shadow-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 border-t border-brand-50">
                    <h4 className="font-bold text-ink truncate">{template.name}</h4>
                    <p className="text-xs text-stone-500 mt-1 truncate">
                      Slot{' '}
                      {template.videoSlot
                        ? `${Math.round(template.videoSlot.width)}×${Math.round(template.videoSlot.height)}`
                        : '—'}
                      {template.categoryId?.name || template.category
                        ? ` · ${template.categoryId?.name || template.category}`
                        : ''}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      <span>
                        {template.canvasWidth}×{template.canvasHeight}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteItem(template._id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'compositions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bk-panel p-10 animate-pulse h-40" />
          ) : compositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bk-panel border-dashed">
              <PlayCircle size={40} className="text-brand-300 mb-4" />
              <h3 className="font-display text-2xl font-bold text-ink">No merged videos yet</h3>
              <p className="text-stone-500 mt-2 text-sm text-center max-w-md">
                Open a template, upload a user video, then Merge & Preview to create compositions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {compositions.map((c) => (
                <div key={c._id} className="bk-panel overflow-hidden">
                  <div className="aspect-video bg-ink relative">
                    {c.mergedVideoUrl ? (
                      <video
                        src={c.mergedVideoUrl}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-orange-200/60">
                        <Clapperboard size={40} />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        c.status === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : c.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                      }`}
                    >
                      {c.status || 'pending'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-ink truncate">
                      {c.templateId?.name || 'Video composition'}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : '—'}
                    </p>
                    {c.mergedVideoUrl && (
                      <a
                        href={c.mergedVideoUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    )}
                    {c.error && (
                      <p className="text-xs text-red-500 mt-2">{c.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showSizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-md"
            onClick={() => setShowSizeModal(false)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[1.75rem] shadow-2xl overflow-hidden border border-brand-100">
            <div className="p-8 pb-0">
              <h2 className="font-display text-3xl font-bold text-ink mb-2">Choose Frame Size</h2>
              <p className="text-stone-500 mb-6">
                Pick an aspect ratio for your Canva-style video frame.
              </p>
            </div>

            <div className="px-8 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ASPECT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleCreate(preset)}
                      className="flex flex-col items-start p-5 rounded-2xl border-2 border-brand-50 hover:border-brand-500 bg-sand hover:bg-white transition-all text-left"
                    >
                      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-brand-600 shadow-sm mb-3">
                        <Icon size={22} />
                      </div>
                      <h5 className="font-bold text-ink text-sm">{preset.name}</h5>
                      <p className="text-[10px] text-stone-500 mt-1">{preset.size}</p>
                      <p className="text-[10px] font-bold text-brand-600 mt-2 uppercase tracking-wider">
                        {preset.id}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-brand-50 pt-6">
                <button
                  type="button"
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
                      <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">
                        Width
                      </label>
                      <input
                        type="number"
                        value={customW}
                        onChange={(e) =>
                          setCustomW(Math.min(4000, Math.max(100, parseInt(e.target.value) || 100)))
                        }
                        className="bk-input mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">
                        Height
                      </label>
                      <input
                        type="number"
                        value={customH}
                        onChange={(e) =>
                          setCustomH(Math.min(4000, Math.max(100, parseInt(e.target.value) || 100)))
                        }
                        className="bk-input mt-1 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-sand flex justify-between items-center border-t border-brand-50">
              <button
                type="button"
                onClick={() => setShowSizeModal(false)}
                className="text-stone-500 font-bold hover:text-ink"
              >
                Cancel
              </button>
              <button type="button" onClick={() => handleCreate('custom')} className="bk-btn px-8 py-3">
                Start Designing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoTemplates;
