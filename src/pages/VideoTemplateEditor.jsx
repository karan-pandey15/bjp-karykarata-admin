import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Type,
  Upload,
  Trash2,
  Film,
  Layers,
  Settings2,
  Play,
  Download,
  Move,
  Image as ImageIcon,
  Loader2,
  Clapperboard,
} from 'lucide-react';
import { fetchCategoriesList } from '../services/categoriesApi';
import { useConfirm } from '../context/ConfirmContext';
import { getErrorMessage, showError, showSuccess } from '../utils/toast';
import {
  uploadVideoTemplateMedia,
  listVideoTemplateMedia,
  deleteVideoTemplateMedia,
  getVideoTemplate,
  createVideoTemplate,
  updateVideoTemplate,
  uploadUserVideo,
  mergeVideoTemplate,
} from '../services/videoTemplatesApi';

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultSlot = (w, h) => ({
  x: Math.round(w * 0.08),
  y: Math.round(h * 0.18),
  width: Math.round(w * 0.84),
  height: Math.round(h * 0.55),
});

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Bake frame overlay + text into a PNG blob; videoSlot left transparent */
async function bakeOverlayPng({
  canvasWidth,
  canvasHeight,
  backgroundColor,
  frameOverlayUrl,
  textLayers,
  videoSlot,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Transparent canvas — only draw frame chrome + text (slot stays clear for video)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Optional solid bars outside slot (helps if no frame PNG)
  if (!frameOverlayUrl) {
    ctx.fillStyle = backgroundColor || '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.clearRect(videoSlot.x, videoSlot.y, videoSlot.width, videoSlot.height);
  }

  if (frameOverlayUrl) {
    try {
      const img = await loadImage(frameOverlayUrl);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    } catch {
      /* keep going */
    }
  }

  (textLayers || []).forEach((t) => {
    ctx.save();
    ctx.fillStyle = t.fill || '#ffffff';
    ctx.font = `${t.fontWeight || '700'} ${t.fontSize || 48}px ${t.fontFamily || 'Mukta, sans-serif'}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = t.align || 'left';
    const x =
      t.align === 'center'
        ? t.x + (t.width || 0) / 2
        : t.align === 'right'
          ? t.x + (t.width || 0)
          : t.x;
    ctx.fillText(t.text || '', x, t.y, t.width || canvasWidth);
    ctx.restore();
  });

  // Ensure video slot is transparent for Canva-style hole
  ctx.clearRect(videoSlot.x, videoSlot.y, videoSlot.width, videoSlot.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob;
}

async function bakeThumbnail({
  canvasWidth,
  canvasHeight,
  backgroundColor,
  frameOverlayUrl,
  textLayers,
  videoSlot,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Fake video placeholder in slot
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(videoSlot.x, videoSlot.y, videoSlot.width, videoSlot.height);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '600 42px Mukta, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'VIDEO',
    videoSlot.x + videoSlot.width / 2,
    videoSlot.y + videoSlot.height / 2
  );

  if (frameOverlayUrl) {
    try {
      const img = await loadImage(frameOverlayUrl);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    } catch {
      /* ignore */
    }
  }

  (textLayers || []).forEach((t) => {
    ctx.save();
    ctx.fillStyle = t.fill || '#ffffff';
    ctx.font = `${t.fontWeight || '700'} ${t.fontSize || 48}px ${t.fontFamily || 'Mukta, sans-serif'}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = t.align || 'left';
    const x =
      t.align === 'center'
        ? t.x + (t.width || 0) / 2
        : t.align === 'right'
          ? t.x + (t.width || 0)
          : t.x;
    ctx.fillText(t.text || '', x, t.y, t.width || canvasWidth);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.82);
}

const VideoTemplateEditor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const isEdit = Boolean(id);

  const initialW = parseInt(searchParams.get('w') || '1080', 10);
  const initialH = parseInt(searchParams.get('h') || '1920', 10);
  const initialRatio = searchParams.get('ratio') || '9:16';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('Festive Frame');
  const [description, setDescription] = useState('Canva-like video frame');
  const [canvasWidth, setCanvasWidth] = useState(initialW);
  const [canvasHeight, setCanvasHeight] = useState(initialH);
  const [aspectRatio, setAspectRatio] = useState(initialRatio === 'custom' ? 'custom' : initialRatio);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [frameOverlayUrl, setFrameOverlayUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoSlot, setVideoSlot] = useState(() => defaultSlot(initialW, initialH));
  const [textLayers, setTextLayers] = useState([]);
  const [selectedId, setSelectedId] = useState('slot'); // 'slot' | text id
  const [sidebarTab, setSidebarTab] = useState('design'); // design | media | compose
  const [media, setMedia] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scale, setScale] = useState(0.35);
  const [dirty, setDirty] = useState(false);

  // Compose / merge flow
  const [userVideoLocal, setUserVideoLocal] = useState(null);
  const [compositionId, setCompositionId] = useState(null);
  const [userVideoUrl, setUserVideoUrl] = useState('');
  const [mergedVideoUrl, setMergedVideoUrl] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeStep, setComposeStep] = useState(''); // '' | uploading | merging | done

  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const frameInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const userVideoInputRef = useRef(null);
  const savedTemplateId = useRef(id || null);

  const markDirty = () => setDirty(true);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const pad = 48;
      const availW = Math.max(200, el.clientWidth - pad);
      const availH = Math.max(200, el.clientHeight - pad);
      const s = Math.min(availW / canvasWidth, availH / canvasHeight, 1);
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasWidth, canvasHeight]);

  const refreshMedia = useCallback(async () => {
    try {
      const list = await listVideoTemplateMedia();
      setMedia(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cats = await fetchCategoriesList();
        setCategories((cats || []).filter((c) => c.isActive !== false));
      } catch (e) {
        console.error(e);
      }
      refreshMedia();
    })();
  }, [refreshMedia]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const t = await getVideoTemplate(id);
        setName(t.name || 'Video Template');
        setDescription(t.description || '');
        setCanvasWidth(t.canvasWidth || 1080);
        setCanvasHeight(t.canvasHeight || 1920);
        setAspectRatio(t.aspectRatio || '9:16');
        setBackgroundColor(t.backgroundColor || '#000000');
        setIsActive(t.isActive !== false);
        setCategoryId(t.categoryId?._id || t.categoryId || '');
        setFrameOverlayUrl(t.frameOverlayUrl || '');
        setThumbnailUrl(t.thumbnailUrl || '');
        setVideoSlot(
          t.videoSlot || defaultSlot(t.canvasWidth || 1080, t.canvasHeight || 1920)
        );
        setTextLayers(Array.isArray(t.textLayers) ? t.textLayers : []);
        savedTemplateId.current = t._id;
      } catch (e) {
        showError(getErrorMessage(e, 'Failed to load video template'));
        navigate('/video-templates');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const applyAspectPreset = (ratio) => {
    const map = {
      '9:16': [1080, 1920],
      '1:1': [1080, 1080],
      '16:9': [1920, 1080],
    };
    const [w, h] = map[ratio] || [canvasWidth, canvasHeight];
    setAspectRatio(ratio);
    setCanvasWidth(w);
    setCanvasHeight(h);
    setVideoSlot(defaultSlot(w, h));
    markDirty();
  };

  const addText = (kind = 'heading') => {
    const layer = {
      id: uid(),
      text: kind === 'heading' ? 'Your Headline' : 'Supporting text here',
      x: Math.round(canvasWidth * 0.1),
      y: kind === 'heading' ? Math.round(canvasHeight * 0.08) : Math.round(canvasHeight * 0.8),
      width: Math.round(canvasWidth * 0.8),
      fontSize: kind === 'heading' ? 64 : 36,
      fontWeight: kind === 'heading' ? '800' : '600',
      fontFamily: 'Rajdhani, sans-serif',
      fill: '#ffffff',
      align: 'center',
    };
    setTextLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
    markDirty();
  };

  const updateText = (tid, patch) => {
    setTextLayers((prev) => prev.map((t) => (t.id === tid ? { ...t, ...patch } : t)));
    markDirty();
  };

  const removeSelected = async () => {
    if (selectedId === 'slot') return;
    const ok = await confirm({
      title: 'Remove text?',
      message: 'Delete this text layer from the frame?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    setTextLayers((prev) => prev.filter((t) => t.id !== selectedId));
    setSelectedId('slot');
    markDirty();
  };

  const onPointerDownSlot = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId('slot');
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...videoSlot };
    dragRef.current = { type: 'slot', mode, startX, startY, start };
  };

  const onPointerDownText = (e, layer) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(layer.id);
    dragRef.current = {
      type: 'text',
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      start: { x: layer.x, y: layer.y },
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;

      if (d.type === 'text') {
        setTextLayers((prev) =>
          prev.map((t) =>
            t.id === d.id
              ? {
                  ...t,
                  x: Math.round(Math.max(0, d.start.x + dx)),
                  y: Math.round(Math.max(0, d.start.y + dy)),
                }
              : t
          )
        );
        setDirty(true);
        return;
      }

      let next = { ...d.start };
      if (d.mode === 'move') {
        next.x = Math.round(Math.min(canvasWidth - next.width, Math.max(0, d.start.x + dx)));
        next.y = Math.round(Math.min(canvasHeight - next.height, Math.max(0, d.start.y + dy)));
      } else if (d.mode === 'se') {
        next.width = Math.round(Math.min(canvasWidth - next.x, Math.max(40, d.start.width + dx)));
        next.height = Math.round(Math.min(canvasHeight - next.y, Math.max(40, d.start.height + dy)));
      } else if (d.mode === 'ne') {
        next.width = Math.round(Math.min(canvasWidth - next.x, Math.max(40, d.start.width + dx)));
        const nh = Math.round(Math.max(40, d.start.height - dy));
        next.y = Math.round(d.start.y + (d.start.height - nh));
        next.height = nh;
      } else if (d.mode === 'sw') {
        next.height = Math.round(Math.min(canvasHeight - next.y, Math.max(40, d.start.height + dy)));
        const nw = Math.round(Math.max(40, d.start.width - dx));
        next.x = Math.round(d.start.x + (d.start.width - nw));
        next.width = nw;
      } else if (d.mode === 'nw') {
        const nw = Math.round(Math.max(40, d.start.width - dx));
        const nh = Math.round(Math.max(40, d.start.height - dy));
        next.x = Math.round(d.start.x + (d.start.width - nw));
        next.y = Math.round(d.start.y + (d.start.height - nh));
        next.width = nw;
        next.height = nh;
      }
      setVideoSlot(next);
      markDirty();
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, canvasWidth, canvasHeight]);

  const handleFrameUpload = async (file) => {
    if (!file) return;
    setMediaUploading(true);
    setUploadProgress(0);
    try {
      const local = URL.createObjectURL(file);
      setFrameOverlayUrl(local);
      markDirty();
      const data = await uploadVideoTemplateMedia(file, (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      if (data?.url) setFrameOverlayUrl(data.url);
      await refreshMedia();
      showSuccess('Frame overlay uploaded');
    } catch (e) {
      showError(getErrorMessage(e, 'Frame upload failed'));
    } finally {
      setMediaUploading(false);
      setUploadProgress(0);
    }
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;
    setMediaUploading(true);
    try {
      const data = await uploadVideoTemplateMedia(file, (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      await refreshMedia();
      if (data?.resourceType === 'image' || !data?.resourceType) {
        const useAsFrame = await confirm({
          title: 'Use as frame overlay?',
          message: 'Set this uploaded image as the frame overlay for the template?',
          confirmText: 'Use as Frame',
          cancelText: 'Library Only',
          tone: 'info',
        });
        if (useAsFrame && data?.url) {
          setFrameOverlayUrl(data.url);
          markDirty();
        }
      }
    } catch (e) {
      showError(getErrorMessage(e, 'Upload failed'));
    } finally {
      setMediaUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteMedia = async (mid) => {
    const ok = await confirm({
      title: 'Delete media?',
      message: 'Remove this asset from the video-templates media library?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteVideoTemplateMedia(mid);
      await refreshMedia();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Template name is required');
      return null;
    }
    setSaving(true);
    try {
      let overlayUrl = frameOverlayUrl;

      // Bake text into overlay when text layers exist (so merge includes them)
      if (textLayers.length > 0 || !overlayUrl) {
        const blob = await bakeOverlayPng({
          canvasWidth,
          canvasHeight,
          backgroundColor,
          frameOverlayUrl: overlayUrl,
          textLayers,
          videoSlot,
        });
        if (blob) {
          const file = new File([blob], `frame-${Date.now()}.png`, { type: 'image/png' });
          const uploaded = await uploadVideoTemplateMedia(file);
          if (uploaded?.url) overlayUrl = uploaded.url;
        }
      }

      const thumb = await bakeThumbnail({
        canvasWidth,
        canvasHeight,
        backgroundColor,
        frameOverlayUrl: overlayUrl,
        textLayers,
        videoSlot,
      });

      const payload = {
        name: name.trim(),
        description: description.trim(),
        frameOverlayUrl: overlayUrl,
        thumbnailUrl: thumb || thumbnailUrl || overlayUrl,
        canvasWidth,
        canvasHeight,
        videoSlot: {
          x: Math.round(videoSlot.x),
          y: Math.round(videoSlot.y),
          width: Math.round(videoSlot.width),
          height: Math.round(videoSlot.height),
        },
        backgroundColor,
        aspectRatio: aspectRatio === 'custom' ? `${canvasWidth}:${canvasHeight}` : aspectRatio,
        categoryId: categoryId || undefined,
        isActive,
        textLayers,
      };

      let templateId = savedTemplateId.current;
      if (templateId) {
        await updateVideoTemplate(templateId, payload);
      } else {
        const res = await createVideoTemplate(payload);
        const created = res?.data || res;
        templateId = created?._id;
        if (templateId) {
          savedTemplateId.current = templateId;
          navigate(`/video-templates/edit/${templateId}`, { replace: true });
        }
      }

      if (overlayUrl) setFrameOverlayUrl(overlayUrl);
      if (thumb) setThumbnailUrl(thumb);
      setDirty(false);
      setSidebarTab('compose');
      return templateId;
    } catch (e) {
      showError(getErrorMessage(e, 'Failed to save video template'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const ensureSavedId = async () => {
    if (savedTemplateId.current) return savedTemplateId.current;
    return handleSave();
  };

  const handleUploadUserVideo = async (file) => {
    if (!file) return;
    const templateId = await ensureSavedId();
    if (!templateId) {
      showError('Save the template first');
      return;
    }
    setComposeBusy(true);
    setComposeStep('uploading');
    try {
      setUserVideoLocal(URL.createObjectURL(file));
      const data = await uploadUserVideo(templateId, file, (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      setCompositionId(data.compositionId || null);
      setUserVideoUrl(data.userVideoUrl || '');
      setMergedVideoUrl('');
      showSuccess(data.message || 'User video uploaded');
    } catch (e) {
      showError(getErrorMessage(e, 'User video upload failed'));
    } finally {
      setComposeBusy(false);
      setComposeStep('');
      setUploadProgress(0);
    }
  };

  const handleMerge = async () => {
    const templateId = await ensureSavedId();
    if (!templateId) {
      showError('Save the template first');
      return;
    }
    setComposeBusy(true);
    setComposeStep('merging');
    try {
      let data;
      if (compositionId) {
        data = await mergeVideoTemplate(templateId, { compositionId });
      } else if (userVideoUrl) {
        data = await mergeVideoTemplate(templateId, { userVideoUrl });
      } else if (userVideoInputRef.current?.files?.[0]) {
        const fd = new FormData();
        fd.append('video', userVideoInputRef.current.files[0]);
        data = await mergeVideoTemplate(templateId, fd);
      } else {
        showError('Upload a user video first');
        return;
      }
      setMergedVideoUrl(data.mergedVideoUrl || '');
      setCompositionId(data.compositionId || compositionId);
      setComposeStep('done');
      showSuccess(data.message || 'Merged successfully');
    } catch (e) {
      showError(getErrorMessage(e, 'Merge failed'));
      setComposeStep('');
    } finally {
      setComposeBusy(false);
    }
  };

  const handleBack = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Leave editor?',
        message: 'You have unsaved changes. Leave without saving?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        tone: 'danger',
      });
      if (!ok) return;
    }
    navigate('/video-templates');
  };

  const selectedText = useMemo(
    () => textLayers.find((t) => t.id === selectedId),
    [textLayers, selectedId]
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-sand flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-stone-500 font-medium">Loading video template…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0a06] text-white flex flex-col">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-ink/90 backdrop-blur flex items-center justify-between px-3 sm:px-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-300 font-bold">
              Video Frame Studio
            </p>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              className="bg-transparent font-display text-lg font-bold outline-none truncate w-full max-w-[240px] sm:max-w-md"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-orange-100/60 font-semibold">
            {canvasWidth}×{canvasHeight} · {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="bk-btn px-4 sm:px-6 py-2.5 flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Template
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-[#16100a] flex flex-col hidden md:flex">
          <div className="flex border-b border-white/10">
            {[
              { id: 'design', label: 'Design', icon: Settings2 },
              { id: 'media', label: 'Media', icon: ImageIcon },
              { id: 'compose', label: 'Merge', icon: Film },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSidebarTab(t.id)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    sidebarTab === t.id
                      ? 'text-brand-300 border-b-2 border-brand-500 bg-white/5'
                      : 'text-orange-100/50 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {sidebarTab === 'design' && (
              <>
                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    rows={2}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['9:16', '1:1', '16:9'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => applyAspectPreset(r)}
                        className={`py-2 rounded-xl text-xs font-bold ${
                          aspectRatio === r
                            ? 'bg-brand-500 text-white'
                            : 'bg-white/5 text-orange-100/70 hover:bg-white/10'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                      Width
                    </label>
                    <input
                      type="number"
                      value={canvasWidth}
                      onChange={(e) => {
                        const w = Math.min(4000, Math.max(100, parseInt(e.target.value) || 100));
                        setCanvasWidth(w);
                        setAspectRatio('custom');
                        markDirty();
                      }}
                      className="w-full mt-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                      Height
                    </label>
                    <input
                      type="number"
                      value={canvasHeight}
                      onChange={(e) => {
                        const h = Math.min(4000, Math.max(100, parseInt(e.target.value) || 100));
                        setCanvasHeight(h);
                        setAspectRatio('custom');
                        markDirty();
                      }}
                      className="w-full mt-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                    Background
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        markDirty();
                      }}
                      className="w-11 h-11 rounded-xl border border-white/10 bg-transparent cursor-pointer"
                    />
                    <input
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        markDirty();
                      }}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      markDirty();
                    }}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
                  >
                    <option value="">General</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id} className="text-ink">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </section>

                <label className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-3">
                  <span className="text-sm font-semibold">Active</span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      setIsActive(e.target.checked);
                      markDirty();
                    }}
                    className="w-4 h-4 accent-brand-500"
                  />
                </label>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                      Frame Overlay PNG
                    </label>
                    <button
                      type="button"
                      onClick={() => frameInputRef.current?.click()}
                      className="text-xs font-bold text-brand-300 hover:text-brand-200"
                    >
                      Upload
                    </button>
                  </div>
                  <input
                    ref={frameInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) handleFrameUpload(f);
                    }}
                  />
                  {frameOverlayUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                      <img src={frameOverlayUrl} alt="Frame" className="w-full h-28 object-contain bg-black/40" />
                      <button
                        type="button"
                        onClick={() => {
                          setFrameOverlayUrl('');
                          markDirty();
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => frameInputRef.current?.click()}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-brand-500/40 bg-brand-500/10 text-sm font-bold text-brand-200 flex flex-col items-center gap-2"
                    >
                      <Upload size={22} />
                      Upload Frame PNG
                    </button>
                  )}
                  {mediaUploading && (
                    <p className="text-xs text-brand-300">Uploading… {uploadProgress}%</p>
                  )}
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50">
                    Video Slot (px)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['x', 'y', 'width', 'height'].map((key) => (
                      <div key={key}>
                        <span className="text-[10px] uppercase text-orange-100/40 font-bold">
                          {key}
                        </span>
                        <input
                          type="number"
                          value={Math.round(videoSlot[key])}
                          onChange={(e) => {
                            setVideoSlot((s) => ({
                              ...s,
                              [key]: Math.max(0, parseInt(e.target.value) || 0),
                            }));
                            setSelectedId('slot');
                            markDirty();
                          }}
                          className="w-full mt-0.5 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm font-bold"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-orange-100/45 flex items-center gap-1">
                    <Move size={12} /> Drag the blue slot on canvas to reposition
                  </p>
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50 flex items-center gap-1">
                    <Type size={12} /> Typography
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => addText('heading')}
                      className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold"
                    >
                      + Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => addText('body')}
                      className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold"
                    >
                      + Body
                    </button>
                  </div>

                  {selectedText && (
                    <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
                      <textarea
                        value={selectedText.text}
                        onChange={(e) => updateText(selectedText.id, { text: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase text-orange-100/40">Size</span>
                          <input
                            type="number"
                            value={selectedText.fontSize}
                            onChange={(e) =>
                              updateText(selectedText.id, {
                                fontSize: parseInt(e.target.value) || 24,
                              })
                            }
                            className="w-full rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-orange-100/40">Color</span>
                          <input
                            type="color"
                            value={selectedText.fill}
                            onChange={(e) => updateText(selectedText.id, { fill: e.target.value })}
                            className="w-full h-9 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeSelected}
                        className="w-full py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} /> Remove Text
                      </button>
                    </div>
                  )}
                </section>

                <section className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-100/50 flex items-center gap-1">
                    <Layers size={12} /> Layers
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedId('slot')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold ${
                      selectedId === 'slot' ? 'bg-brand-500/30 text-brand-200' : 'bg-white/5'
                    }`}
                  >
                    ▭ Video Slot
                  </button>
                  {textLayers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold truncate ${
                        selectedId === t.id ? 'bg-brand-500/30 text-brand-200' : 'bg-white/5'
                      }`}
                    >
                      T {t.text || 'Text'}
                    </button>
                  ))}
                </section>
              </>
            )}

            {sidebarTab === 'media' && (
              <>
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={mediaUploading}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-brand-500/40 bg-brand-500/10 font-bold text-sm flex flex-col items-center gap-2"
                >
                  <Upload size={20} />
                  Upload Asset (image / video)
                </button>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handleMediaUpload(f);
                  }}
                />
                {mediaUploading && (
                  <p className="text-xs text-brand-300">Uploading… {uploadProgress}%</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {media.map((m) => (
                    <div
                      key={m._id || m.publicId}
                      className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-square"
                    >
                      {m.resourceType === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                        {m.resourceType !== 'video' && (
                          <button
                            type="button"
                            onClick={() => {
                              setFrameOverlayUrl(m.url);
                              markDirty();
                            }}
                            className="text-[10px] font-bold bg-white text-ink px-2 py-1 rounded-lg w-full"
                          >
                            Use Frame
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(m._id || m.publicId)}
                          className="text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-lg w-full"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {media.length === 0 && (
                  <p className="text-sm text-orange-100/40 text-center py-8">
                    No media yet. Upload frame PNGs or sample clips.
                  </p>
                )}
              </>
            )}

            {sidebarTab === 'compose' && (
              <>
                <div className="rounded-2xl bg-brand-500/10 border border-brand-500/30 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-300">
                    Product flow
                  </p>
                  <ol className="text-sm text-orange-100/80 space-y-1 list-decimal list-inside">
                    <li>Upload frame asset</li>
                    <li>Save template</li>
                    <li>Upload user video</li>
                    <li>Merge & preview</li>
                  </ol>
                </div>

                {!savedTemplateId.current && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    Save the template first so merge can attach to a template id.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => userVideoInputRef.current?.click()}
                  disabled={composeBusy}
                  className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Upload User Video
                </button>
                <input
                  ref={userVideoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadUserVideo(f);
                  }}
                />

                {(userVideoLocal || userVideoUrl) && (
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                    <video
                      src={userVideoUrl || userVideoLocal}
                      controls
                      className="w-full max-h-40 object-contain"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={composeBusy || (!compositionId && !userVideoUrl && !userVideoLocal)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {composeBusy ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Clapperboard size={18} />
                  )}
                  {composeStep === 'merging' ? 'Merging…' : 'Merge & Preview'}
                </button>

                {mergedVideoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <Play size={12} /> Merged output
                    </p>
                    <video
                      src={mergedVideoUrl}
                      controls
                      className="w-full rounded-xl border border-emerald-500/30 bg-black"
                    />
                    <a
                      href={mergedVideoUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-white text-ink font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download Merged Video
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Canvas stage */}
        <main
          ref={stageRef}
          className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,#2a1a0c_0%,#0f0a06_70%)]"
          onClick={() => setSelectedId('slot')}
        >
          <div
            className="relative shadow-2xl shadow-black/60"
            style={{
              width: canvasWidth * scale,
              height: canvasHeight * scale,
              backgroundColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video slot */}
            <div
              className={`absolute border-2 ${
                selectedId === 'slot' ? 'border-sky-400' : 'border-sky-400/50'
              } bg-sky-500/15 cursor-move`}
              style={{
                left: videoSlot.x * scale,
                top: videoSlot.y * scale,
                width: videoSlot.width * scale,
                height: videoSlot.height * scale,
              }}
              onPointerDown={(e) => onPointerDownSlot(e, 'move')}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sky-200/90 text-xs sm:text-sm font-black tracking-[0.2em] uppercase bg-ink/50 px-3 py-1 rounded-lg">
                  Video Area
                </span>
              </div>
              {selectedId === 'slot' &&
                ['nw', 'ne', 'sw', 'se'].map((corner) => (
                  <div
                    key={corner}
                    onPointerDown={(e) => onPointerDownSlot(e, corner)}
                    className={`absolute w-3.5 h-3.5 bg-sky-400 border-2 border-white rounded-sm z-10 ${
                      corner === 'nw'
                        ? 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'
                        : corner === 'ne'
                          ? 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'
                          : corner === 'sw'
                            ? 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'
                            : 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize'
                    }`}
                  />
                ))}
            </div>

            {/* Frame overlay */}
            {frameOverlayUrl && (
              <img
                src={frameOverlayUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
              />
            )}

            {/* Text layers */}
            {textLayers.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => onPointerDownText(e, t)}
                className={`absolute cursor-move select-none whitespace-pre-wrap ${
                  selectedId === t.id ? 'outline outline-2 outline-brand-400 outline-offset-2' : ''
                }`}
                style={{
                  left: t.x * scale,
                  top: t.y * scale,
                  width: (t.width || canvasWidth * 0.8) * scale,
                  color: t.fill,
                  fontSize: (t.fontSize || 48) * scale,
                  fontWeight: t.fontWeight || 700,
                  fontFamily: t.fontFamily || 'Rajdhani, sans-serif',
                  textAlign: t.align || 'center',
                  lineHeight: 1.15,
                }}
              >
                {t.text}
              </div>
            ))}
          </div>

          {/* Mobile compose hint */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={() => addText('heading')}
              className="flex-1 py-3 rounded-xl bg-white/10 backdrop-blur font-bold text-xs"
            >
              + Text
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-brand-500 font-bold text-xs"
            >
              Save
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VideoTemplateEditor;
