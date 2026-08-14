import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  Type,
  Image as ImageIcon,
  Trash2,
  Save,
  ChevronLeft,
  Upload,
  Layers,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  Menu,
  X,
  Palette,
  MousePointer2,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Square,
  GripVertical
} from 'lucide-react';
import { Canvas, IText, FabricImage, Rect, Circle, Line } from 'fabric';
import { Reorder, useDragControls } from 'framer-motion';
import api, { muteToast } from '../services/api';
import { fetchCategoriesList } from '../services/categoriesApi';
import { initAligningGuidelines } from '../utils/initAligningGuidelines';
import { showError } from '../utils/toast';
import { useConfirm } from '../context/ConfirmContext';

// Helper to normalize colors for <input type="color">
const normalizeColor = (color) => {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;

  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1).toUpperCase();
    }
  }
  return '#000000';
};

// Stable ID generator for Fabric objects
const generateId = () => `obj-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

const TemplateEditor = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [activeObject, setActiveObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [category, setCategory] = useState('General');
  const [categoryId, setCategoryId] = useState('');
  const [isHeroSection, setIsHeroSection] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [templateType, setTemplateType] = useState('CONTENT');
  const [categories, setCategories] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Layout & UI State
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'layers'
  const [layers, setLayers] = useState([]);
  const isDragging = useRef(false);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const clipboard = useRef(null);
  const isInternalChange = useRef(false);



  const canvasType = searchParams.get('type') || 'post';

  // Canvas Configurations
  const configs = {
    post: { width: 1080, height: 1080, ratio: '1:1', name: 'IG Post' },
    story: { width: 1080, height: 1920, ratio: '9:16', name: 'IG Story' },
    portrait: { width: 1080, height: 1350, ratio: '4:5', name: 'IG Portrait' },
    fb_post: { width: 1200, height: 630, ratio: '1.91:1', name: 'FB Post' },
    banner: { width: 820, height: 312, ratio: '2.6:1', name: 'FB Cover' },
    twitter: { width: 1200, height: 675, ratio: '16:9', name: 'Twitter Post' },
    youtube: { width: 1280, height: 720, ratio: '16:9', name: 'YT Thumbnail' },
    linkedin: { width: 1584, height: 396, ratio: '4:1', name: 'LinkedIn Banner' },
    custom: {
      width: parseInt(searchParams.get('w')) || 1080,
      height: parseInt(searchParams.get('h')) || 1080,
      ratio: `${searchParams.get('w')}:${searchParams.get('h')}`,
      name: 'Custom Size'
    }
  };

  const currentConfig = configs[canvasType] || configs.post;

  // --- CORE WORKFLOW & DESIGN TOOLS (Declared early for useEffect dependencies) ---
  const saveHistory = useCallback((canvasInstance = canvas) => {
    if (!canvasInstance || isInternalChange.current) return;
    const json = JSON.stringify(canvasInstance.toJSON(['id', 'role']));

    // Only push if different from last state to avoid duplicates
    const lastState = undoStack.current[undoStack.current.length - 1];
    if (json !== lastState) {
      undoStack.current.push(json);
      // Limit history size
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current = []; // Clear redo on new action
    }
  }, [canvas]);

  const undo = useCallback(async () => {
    if (!canvas || undoStack.current.length <= 1) return;

    isInternalChange.current = true;
    const currentState = undoStack.current.pop();
    redoStack.current.push(currentState);

    const previousState = undoStack.current[undoStack.current.length - 1];
    await canvas.loadFromJSON(JSON.parse(previousState));
    canvas.renderAll();
    isInternalChange.current = false;
    setRenderTick(t => t + 1);
  }, [canvas]);

  const redo = useCallback(async () => {
    if (!canvas || redoStack.current.length === 0) return;

    isInternalChange.current = true;
    const nextState = redoStack.current.pop();
    undoStack.current.push(nextState);

    await canvas.loadFromJSON(JSON.parse(nextState));
    canvas.renderAll();
    isInternalChange.current = false;
    setRenderTick(t => t + 1);
  }, [canvas]);

  const copy = useCallback(async () => {
    if (!canvas || !activeObject) return;
    const cloned = await activeObject.clone();
    clipboard.current = cloned;
  }, [canvas, activeObject]);

  const paste = useCallback(async () => {
    if (!canvas || !clipboard.current) return;

    const clonedObj = await clipboard.current.clone();
    canvas.discardActiveObject();

    clonedObj.set({
      left: clonedObj.left + 20,
      top: clonedObj.top + 20,
      evented: true,
    });

    if (clonedObj.type === 'activeSelection') {
      clonedObj.canvas = canvas;
      clonedObj.forEachObject((obj) => {
        canvas.add(obj);
      });
      clonedObj.setCoords();
    } else {
      canvas.add(clonedObj);
    }

    clipboard.current = clonedObj;
    canvas.setActiveObject(clonedObj);
    canvas.requestRenderAll();
  }, [canvas]);

  const addText = useCallback((textType = 'heading') => {
    if (!canvas) return;

    let fontSize = 80;
    let fontWeight = 'bold';
    let content = 'HEADING';

    if (textType === 'subheading') {
      fontSize = 50;
      content = 'Subheading';
    } else if (textType === 'body') {
      fontSize = 32;
      fontWeight = 'normal';
      content = 'Tap to edit text...';
    }

    const text = new IText(content, {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontFamily: 'Inter',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, [canvas, currentConfig]);

  const addRect = useCallback(() => {
    if (!canvas) return;
    const rect = new Rect({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      fill: '#CBD5E1',
      width: 200,
      height: 200,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  }, [canvas, currentConfig]);

  const addCircle = useCallback(() => {
    if (!canvas) return;
    const circle = new Circle({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      fill: '#CBD5E1',
      radius: 100,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  }, [canvas, currentConfig]);

  const addLine = useCallback(() => {
    if (!canvas) return;
    const line = new Line([50, 50, 250, 50], {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      stroke: '#000000',
      strokeWidth: 4,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(line);
    canvas.setActiveObject(line);
  }, [canvas, currentConfig]);

  const deleteSelected = useCallback(() => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setActiveObject(null);
  }, [canvas, activeObject]);

  const applyFillColor = useCallback(
    (color) => {
      if (!canvas || !activeObject || !color) return;
      const obj = activeObject;
      const isText = String(obj.type || '').toLowerCase().includes('text');

      if (isText && typeof obj.setSelectionStyles === 'function') {
        const start = obj.selectionStart ?? 0;
        const end = obj.selectionEnd ?? 0;
        try {
          if (obj.isEditing && end !== start) {
            obj.setSelectionStyles({ fill: color });
          } else {
            obj.set('fill', color);
            const len = (obj.text || '').length;
            if (len > 0) obj.setSelectionStyles({ fill: color }, 0, len);
          }
        } catch {
          obj.set('fill', color);
        }
      } else {
        obj.set('fill', color);
      }

      canvas.renderAll();
      setIsDirty(true);
      setRenderTick((t) => t + 1);
    },
    [canvas, activeObject]
  );

  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const zoomToFit = useCallback((canvasInstance) => {
    const container = document.getElementById('canvas-viewport');
    if (!container || !canvasInstance) return;

    // Stable padding so sidebar/layout changes don't crush the canvas
    const pad = 64;
    const availableWidth = Math.max(container.clientWidth - pad, 200);
    const availableHeight = Math.max(container.clientHeight - pad, 200);

    const scaleX = availableWidth / currentConfig.width;
    const scaleY = availableHeight / currentConfig.height;
    const finalScale = Math.min(scaleX, scaleY, 1);
    const safeScale = Math.max(finalScale, 0.08);

    canvasInstance.setZoom(safeScale);
    canvasInstance.setDimensions({
      width: currentConfig.width * safeScale,
      height: currentConfig.height * safeScale,
    });

    setZoomLevel(safeScale);
    canvasInstance.requestRenderAll();
  }, [currentConfig.width, currentConfig.height]);

  const placeImageOnCanvas = useCallback(
    async (source, canvasInstance = canvas) => {
      if (!canvasInstance || !source) return null;

      // Prefer local/blob first; only use crossOrigin for remote http(s) URLs
      const isRemote = typeof source === 'string' && /^https?:\/\//i.test(source);
      let img;
      try {
        img = await FabricImage.fromURL(
          source,
          isRemote ? { crossOrigin: 'anonymous' } : undefined
        );
      } catch (err) {
        // Retry without CORS if server headers block anonymous
        img = await FabricImage.fromURL(source);
      }

      if (!img || !img.width || !img.height) {
        throw new Error('Image failed to load');
      }

      const maxW = currentConfig.width * 0.85;
      const maxH = currentConfig.height * 0.85;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);

      img.set({
        id: generateId(),
        scaleX: scale,
        scaleY: scale,
        left: currentConfig.width / 2,
        top: currentConfig.height / 2,
        originX: 'center',
        originY: 'center',
      });

      canvasInstance.add(img);
      canvasInstance.setActiveObject(img);
      canvasInstance.requestRenderAll();
      setActiveObject(img);
      setIsDirty(true);
      return img;
    },
    [canvas, currentConfig.width, currentConfig.height]
  );

  const syncLayers = useCallback((canvasInstance = canvas, skipPreview = false) => {
    if (!canvasInstance || isDragging.current) return;
    const objects = [...canvasInstance.getObjects()].reverse(); // Front-to-back

    // Generate previews (highly optimized thumbnails)
    const mapped = objects.map(obj => {
      // Ensure object has a stable ID
      if (!obj.id) obj.id = generateId();

      // Only generate preview if missing
      if (!obj._cachedPreview) {
        try {
          obj._cachedPreview = obj.toDataURL({
            format: 'png',
            multiplier: 0.15,
            quality: 0.5
          });
        } catch (e) {
          console.warn('Preview error', e);
        }
      }
      return { id: obj.id, obj, preview: obj._cachedPreview };
    });
    setLayers(mapped);
  }, [canvas]);

  const handleReorder = (newLayers) => {
    // 1. Update React state ONLY for smooth UI animation
    setLayers(newLayers);
  };

  const finalizeReorder = (finalLayers = layers) => {
    if (!canvas) return;

    // 2. Heavy canvas update only on drop (onDragEnd)
    finalLayers.forEach((layer, index) => {
      const fabricIndex = finalLayers.length - 1 - index;
      if (layer.obj.canvas) {
        canvas.moveObjectTo(layer.obj, fabricIndex);
      }
    });

    canvas.requestRenderAll();
    saveHistory(canvas);
    setIsDirty(true);
    isDragging.current = false;
  };

  useEffect(() => {
    const initCanvas = new Canvas('editor-canvas', {
      width: currentConfig.width,
      height: currentConfig.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    setCanvas(initCanvas);
    initAligningGuidelines(initCanvas);

    // Initial zoom after layout settles (sidebar + viewport)
    const timer = setTimeout(() => {
      zoomToFit(initCanvas);
      syncLayers(initCanvas);
    }, 100);
    const timer2 = setTimeout(() => zoomToFit(initCanvas), 350);

    initCanvas.on('selection:created', (e) => {
      setActiveObject(e.selected[0]);
      syncLayers(initCanvas);
    });
    initCanvas.on('selection:updated', (e) => {
      setActiveObject(e.selected[0]);
      syncLayers(initCanvas);
    });
    initCanvas.on('selection:cleared', () => {
      setActiveObject(null);
      syncLayers(initCanvas);
    });

    initCanvas.on('object:added', () => {
      if (!isInternalChange.current) {
        saveHistory(initCanvas);
        setIsDirty(true);
      }
      syncLayers(initCanvas);
    });
    initCanvas.on('object:removed', () => {
      if (!isInternalChange.current) {
        saveHistory(initCanvas);
        setIsDirty(true);
      }
      syncLayers(initCanvas);
    });

    initCanvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj && obj.type && obj.type.includes('text')) {
        // "HONEST TYPOGRAPHY" FIX: 
        if (obj.scaleX !== 1 || obj.scaleY !== 1) {
          const newFontSize = Math.round(obj.fontSize * obj.scaleY);
          const newWidth = obj.width * obj.scaleX;
          obj.set({ fontSize: newFontSize, width: newWidth, scaleX: 1, scaleY: 1 });
          obj.setCoords();
        }
      }
      if (!isInternalChange.current) {
        saveHistory(initCanvas);
        setIsDirty(true);
      }
      syncLayers(initCanvas);
    });

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => zoomToFit(initCanvas), 120);
    };

    window.addEventListener('resize', handleResize);
    const viewport = document.getElementById('canvas-viewport');
    const ro = viewport && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleResize)
      : null;
    if (viewport && ro) ro.observe(viewport);

    if (id) {
      loadTemplate(id, initCanvas);
    }
    fetchCategories();
    fetchMediaLibrary();

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(resizeTimer);
      ro?.disconnect();
      initCanvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [id, canvasType]);

  // KEYBOARD SHORTCUTS ENGINE
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e) => {
      // 1. Guard Clauses: Ignore if typing in text fields
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      const isTextEditing = canvas?.getActiveObject()?.isEditing;

      if (isInputFocused || isTextEditing) {
        // Allow select all (Ctrl+A) even in inputs, but handle deletion carefully
        return;
      }

      const isMod = e.ctrlKey || e.metaKey; // Ctrl or Cmd
      const step = e.shiftKey ? 10 : 1;
      const activeObj = canvas?.getActiveObject();

      // --- Essential Workflow ---
      // Undo: Ctrl/Cmd + Z
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((isMod && e.shiftKey && e.key === 'z') || (isMod && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Copy: Ctrl/Cmd + C
      if (isMod && e.key === 'c') {
        e.preventDefault();
        copy();
      }
      // Paste: Ctrl/Cmd + V
      if (isMod && e.key === 'v') {
        e.preventDefault();
        paste();
      }
      // Duplicate: Ctrl/Cmd + D
      if (isMod && e.key === 'd') {
        e.preventDefault();
        copy().then(() => paste());
      }
      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObj) {
          e.preventDefault();
          deleteSelected();
        }
      }
      // Select All: Ctrl/Cmd + A
      if (isMod && e.key === 'a') {
        e.preventDefault();
        canvas.discardActiveObject();
        const sel = new fabric.ActiveSelection(canvas.getObjects(), { canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
      }

      // --- Element Movement (Arrows) ---
      if (activeObj && !isTextEditing) {
        if (e.key === 'ArrowUp') { e.preventDefault(); activeObj.set('top', activeObj.top - step); activeObj.setCoords(); canvas.renderAll(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); activeObj.set('top', activeObj.top + step); activeObj.setCoords(); canvas.renderAll(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); activeObj.set('left', activeObj.left - step); activeObj.setCoords(); canvas.renderAll(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); activeObj.set('left', activeObj.left + step); activeObj.setCoords(); canvas.renderAll(); }
      }

      // --- Quick Element Creation ---
      if (!isMod && !e.altKey) {
        if (e.key === 't') { e.preventDefault(); addText('body'); }
        if (e.key === 'r') { e.preventDefault(); addRect(); }
        if (e.key === 'c') { e.preventDefault(); addCircle(); }
        if (e.key === 'l') { e.preventDefault(); addLine(); }
      }

      // --- Layer Management ---
      if (isMod && activeObj) {
        if (e.key === ']') {
          e.preventDefault();
          if (e.shiftKey) canvas.bringToFront(activeObj); else canvas.bringForward(activeObj);
          canvas.renderAll();
        }
        if (e.key === '[') {
          e.preventDefault();
          if (e.shiftKey) canvas.sendToBack(activeObj); else canvas.sendBackwards(activeObj);
          canvas.renderAll();
        }
      }

      // --- Formatting (B/I/U) ---
      if (isMod && activeObj?.type?.includes('text')) {
        if (e.key === 'b') { e.preventDefault(); activeObj.set('fontWeight', activeObj.fontWeight === 'bold' ? 'normal' : 'bold'); canvas.renderAll(); }
        if (e.key === 'i') { e.preventDefault(); activeObj.set('fontStyle', activeObj.fontStyle === 'italic' ? 'normal' : 'italic'); canvas.renderAll(); }
        if (e.key === 'u') { e.preventDefault(); activeObj.set('underline', !activeObj.underline); canvas.renderAll(); }
      }

      // --- Zooming ---
      if (isMod) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); handleManualZoom(zoomLevel + 0.1); }
        if (e.key === '-') { e.preventDefault(); handleManualZoom(zoomLevel - 0.1); }
        if (e.key === '0') { e.preventDefault(); zoomToFit(canvas); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, undo, redo, copy, paste, deleteSelected]);

  const fetchCategories = async () => {
    try {
      const list = await fetchCategoriesList();
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const fetchMediaLibrary = async () => {
    try {
      setIsMediaLoading(true);
      const res = await api.get('/templates/media', muteToast);
      const data = res.data;
      const items = Array.isArray(data) ? data : data?.media || data?.items || [];
      setMediaLibrary(items);
    } catch (err) {
      console.error('Error fetching media library:', err);
    } finally {
      setIsMediaLoading(false);
    }
  };





  const handleManualZoom = (newZoom) => {
    if (!canvas) return;
    const scale = Math.max(0.05, Math.min(newZoom, 2));
    canvas.setZoom(scale);
    canvas.setDimensions({
      width: currentConfig.width * scale,
      height: currentConfig.height * scale,
    });
    setZoomLevel(scale);
    canvas.requestRenderAll();
  };

  const loadTemplate = async (templateId, canvasInstance) => {
    try {
      setLoading(true);
      const res = await api.get(`/templates/${templateId}`, muteToast);
      const template = res.data;
      setTemplateName(template.name);
      setCategory(template.category);
      setCategoryId(template.categoryId?._id || template.categoryId || '');
      setIsHeroSection(template.isHeroSection || false);
      if (template.scheduledDate) {
        setScheduledDate(new Date(template.scheduledDate).toISOString().split('T')[0]);
      }
      setTemplateType(template.type || 'CONTENT');

      if (template.fabricJSON) {
        // Prevent loading into a disposed canvas (React Strict Mode double mount issue)
        if (canvasInstance && canvasInstance.contextContainer) {
          await canvasInstance.loadFromJSON(template.fabricJSON);

          // --- LOGGING JSON AND ELEMENT PROPERTIES ---
          console.groupCollapsed('🔍 [DEBUG] TEMPLATE LOADED');
          console.log('Raw Fabric JSON:', template.fabricJSON);
          const objects = canvasInstance.getObjects();
          console.log(`Total Canvas Elements: ${objects.length}`);
          objects.forEach((obj, i) => {
            // Assign ID to loaded objects if missing
            if (!obj.id) obj.id = generateId();

            console.log(`[${i}] ${obj.type.toUpperCase()}`, {
              type: obj.type,
              text: obj.text || null,
              width: obj.width,
              height: obj.height,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              fontSize: obj.fontSize || null,
              fill: obj.fill,
              left: obj.left,
              top: obj.top,
              angle: obj.angle,
              rawObject: obj
            });
          });
          console.groupEnd();

          canvasInstance.renderAll();
          zoomToFit(canvasInstance);
          setIsDirty(false);
        } else {
          console.warn('Canvas disposed before template could load.');
        }
      }

    } catch (err) {
      console.error('Error loading template:', err);
    } finally {
      setLoading(false);
    }
  };



  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!canvas) {
      showError('Canvas is still loading. Try again in a moment.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    let placedOnCanvas = false;

    try {
      setLoading(true);
      setUploadProgress(1);

      // 1) Show image on canvas immediately from local file (fixes blank CORS uploads)
      const img = await placeImageOnCanvas(localUrl, canvas);
      placedOnCanvas = true;
      if (window.innerWidth < 1024) setIsSidebarOpen(false);

      // 2) Upload to backend and swap to permanent URL when available
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        successMessage: 'Image uploaded successfully',
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(progress);
        },
      });

      const imageUrl = res.data?.url || res.data?.imageUrl || res.data?.data?.url;
      let swappedToServer = false;
      if (imageUrl && img) {
        try {
          await img.setSrc(imageUrl, { crossOrigin: 'anonymous' });
          swappedToServer = true;
        } catch {
          try {
            await img.setSrc(imageUrl);
            swappedToServer = true;
          } catch (swapErr) {
            console.warn('Kept local preview; could not swap to server URL', swapErr);
          }
        }
        if (swappedToServer) {
          img.setCoords();
          canvas.requestRenderAll();
          setIsDirty(true);
          URL.revokeObjectURL(localUrl);
        }
      }

      fetchMediaLibrary();
    } catch (err) {
      console.error('Upload failed:', err);
      showError(err?.response?.data?.message || err?.message || 'Upload failed');
      if (!placedOnCanvas) URL.revokeObjectURL(localUrl);
    } finally {
      setIsMediaLoading(false);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const addFromLibrary = async (imageUrl) => {
    if (!canvas || !imageUrl) return;
    try {
      setLoading(true);
      await placeImageOnCanvas(imageUrl, canvas);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (err) {
      console.error('Adding from library failed:', err);
      showError('Could not add image to canvas');
    } finally {
      setLoading(false);
    }
  };

  const deleteFromLibrary = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete image?',
      message: 'Delete this image forever from the media library?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      setIsMediaLoading(true);
      await api.delete(`/templates/media/${id}`, { successMessage: 'Image deleted' });
      fetchMediaLibrary();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsMediaLoading(false);
    }
  };



  const normalizeTemplate = () => {
    if (!canvas) return null;

    const objects = canvas.getObjects();
    const images = [];
    const textLayers = [];

    // Use actual internal canvas dimensions for normalization
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Explicitly handle Background
    const bgImage = canvas.backgroundImage;
    if (bgImage) {
      images.push({
        image: bgImage.src,
        x: 0, y: 0, width: 1, height: 1,
        fit: 'cover',
        isBackground: true,
        zIndex: -1
      });
    }

    objects.forEach((obj, index) => {
      // 1. STABLE RESOLUTION SYNC
      // Always use the base resolution (1080px), NOT the current zoomed canvas width
      const baseWidth = currentConfig.width;
      const baseHeight = currentConfig.height;

      // 2. Capture the VISUAL CENTER while the design is in its final state
      // Capture this before un-rotating to ensure the pivot is correct
      const center = obj.getCenterPoint();
      const x = center.x / baseWidth;
      const y = center.y / baseHeight;

      // 3. Temporarily un-rotate ONLY to get the pure rectangle dimensions
      const originalAngle = obj.angle || 0;
      obj.set('angle', 0);
      obj.setCoords();

      const width = (obj.type.includes('text') ? obj.width * obj.scaleX : obj.getScaledWidth()) / baseWidth;
      const height = (obj.type.includes('text') ? obj.height * obj.scaleY : obj.getScaledHeight()) / baseHeight;

      // 4. Restore original angle immediately
      obj.set('angle', originalAngle);
      obj.setCoords();

      const opacity = obj.opacity || 1;
      const zIndex = index;

      const isForcedBackground = obj.id === 'background' || obj.name === 'background';

      if (obj.type === 'image' || obj.type === 'image-layer') {
        images.push({
          image: obj._element?.src || obj.src,
          x, y, width, height,
          angle: originalAngle, opacity, zIndex,
          fit: 'contain',
          isBackground: isForcedBackground,
          role: obj.role || 'none'
        });
      } else if (obj.type.includes('text')) {
        textLayers.push({
          text: obj.text,
          font: obj.fontFamily,
          size: obj.fontSize * (obj.scaleY || 1),
          sizeRatio: (obj.fontSize * (obj.scaleY || 1)) / baseWidth, // Honest size ratio capturing true visual scale
          color: obj.fill,
          x, y,
          width, height,
          angle: originalAngle, opacity, zIndex,
          bold: obj.fontWeight === 'bold',
          italic: obj.fontStyle === 'italic',
          textAlign: obj.textAlign || 'left',
          letterSpacing: obj.charSpacing || 0,
          lineHeight: obj.lineHeight || 1.16,
          uppercase: obj.uppercase || false,
          strokeColor: obj.stroke || '#000000',
           strokeWidth: obj.strokeWidth || 0,
          role: obj.role || 'none'
        });
      }
    });

    return {
      name: templateName,
      category: category,
      categoryId: categoryId || null,
       isHeroSection: isHeroSection,
      type: templateType,
      scheduledDate: scheduledDate || null,
      baseColor: canvas.backgroundColor,
      ratio: currentConfig.ratio,
      size: canvasType.toUpperCase(),
      images,
      textLayers,
      fabricJSON: canvas.toJSON(['id', 'role'])
    };
  };

  const saveTemplate = async () => {
    const data = normalizeTemplate();
    if (!data) return;

    // Generate accurate visual thumbnail for preview
    const thumbnail = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.8,
      multiplier: 0.8 // High enough for mobile preview, low enough for storage
    });

    data.thumbnail = thumbnail;

    // --- DEBUG LOG FOR JSON PAYLOAD ---
    console.group('🚀 [DEBUG] SAVING TEMPLATE JSON');
    console.log('Sending this payload to Database:');
    const debugData = { ...data };
    delete debugData.fabricJSON; // Hide huge string
    delete debugData.thumbnail;  // Hide huge base64
    console.log(debugData);
    console.groupEnd();

    try {
      setLoading(true);

      if (id) {
        await api.put(`/templates/${id}`, data, { successMessage: 'Design saved successfully' });
      } else {
        await api.post('/templates', data, { successMessage: 'Template created successfully' });
        navigate('/templates');
      }
      setIsDirty(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex flex-col z-[200] overflow-hidden select-none">
      {/* Production Header */}
      <header className="h-14 bg-white border-b border-brand-100 flex items-center justify-between px-3 sm:px-6 shrink-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={async () => {
              if (isDirty) {
                const ok = await confirm({
                  title: 'Unsaved changes',
                  message: 'You have unsaved changes. Exit anyway?',
                  confirmText: 'Exit',
                  cancelText: 'Stay',
                  tone: 'danger',
                });
                if (!ok) return;
              }
              navigate('/templates');
            }}
            className="p-2 hover:bg-brand-50 rounded-lg transition-colors text-ink z-[100] cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="hidden sm:block h-6 w-px bg-brand-100" />
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/images/home/social-instagram.png"
              alt="BJP"
              className="w-8 h-8 rounded-lg object-contain bg-ink p-0.5 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-xs sm:text-sm font-extrabold text-ink bg-transparent border-none focus:outline-none hover:bg-sand rounded px-1 truncate"
              />
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                  {currentConfig.name} · {currentConfig.width}×{currentConfig.height}
                </span>
                <span className="text-[9px] text-brand-600 font-bold">{Math.round(zoomLevel * 100)}%</span>
                {isDirty && <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" title="Unsaved changes" />}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop Zoom */}
          <div className="hidden md:flex items-center gap-2 bg-sand px-3 py-1.5 rounded-xl border border-brand-100">
            <button type="button" onClick={() => handleManualZoom(zoomLevel - 0.1)} className="text-stone-400 hover:text-ink transition-colors"><ZoomOut size={16} /></button>
            <span className="text-[10px] font-black text-stone-700 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button type="button" onClick={() => handleManualZoom(zoomLevel + 0.1)} className="text-stone-400 hover:text-ink transition-colors"><ZoomIn size={16} /></button>
          </div>

          <button
            type="button"
            onClick={saveTemplate}
            disabled={loading}
            className="bg-brand-500 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <Save size={16} className="hidden sm:inline" />
            {loading ? '...' : 'Save'}
          </button>

          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 bg-brand-50 rounded-lg text-brand-700"
            aria-label="Toggle design tools"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile overlay when tools open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-ink/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Design tools sidebar — always visible on desktop */}
        <aside
          className={`
            absolute lg:relative inset-y-0 left-0 z-40
            w-[min(100%,20rem)] sm:w-80
            bg-white border-r border-brand-100
            flex flex-col shrink-0
            transition-transform duration-300 ease-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Sidebar Tabs */}
          <div className="flex border-b border-brand-50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'design' ? 'text-brand-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Design
              {activeTab === 'design' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 mx-8" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'layers' ? 'text-brand-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Layers
              {activeTab === 'layers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 mx-8" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
            {activeTab === 'design' ? (
              <div className="space-y-8">
                {/* Upload — always first & visible */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">
                      Upload Media
                    </h3>
                    <button
                      type="button"
                      onClick={fetchMediaLibrary}
                      disabled={isMediaLoading}
                      className={`p-1.5 hover:bg-brand-50 rounded-lg text-brand-500 transition-all ${isMediaLoading ? 'animate-spin' : ''}`}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-3 p-6 bg-brand-50 border-2 border-dashed border-brand-400 rounded-2xl cursor-pointer hover:bg-brand-100 hover:border-brand-500 transition-all group relative overflow-hidden">
                    <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                      {loading || isMediaLoading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload size={24} />
                      )}
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-black text-ink">
                        {loading ? 'Uploading…' : 'Upload Image'}
                      </span>
                      <span className="block text-[10px] font-bold text-brand-700/70 uppercase mt-1">
                        PNG, JPG, SVG — click to browse
                      </span>
                    </div>
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      accept="image/*"
                      disabled={loading}
                    />
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="absolute bottom-0 left-0 h-1.5 bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    )}
                  </label>

                  <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {mediaLibrary.map((item, index) => (
                      <div key={item._id || index} className="relative group">
                        <button
                          type="button"
                          onClick={() => addFromLibrary(item.url)}
                          className="w-full aspect-square rounded-xl overflow-hidden border border-brand-100 hover:border-brand-500 transition-all relative"
                        >
                          <img src={item.url} alt="Upload" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteFromLibrary(e, item._id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    {!isMediaLoading && mediaLibrary.length === 0 && (
                      <p className="col-span-3 text-center text-xs text-stone-400 py-4">
                        No images yet — upload one above
                      </p>
                    )}
                  </div>
                </section>

                {/* Typography */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Typography</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button type="button" onClick={() => addText('heading')} className="flex items-center gap-4 p-4 bg-sand border border-brand-100 rounded-2xl hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all group">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-600 shadow-sm group-hover:scale-110 transition-transform"><Type size={20} /></div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-black">Add Heading</span>
                        <span className="text-[9px] font-bold opacity-50 uppercase">Bold Title Text</span>
                      </div>
                    </button>
                    <button type="button" onClick={() => addText('body')} className="flex items-center gap-4 p-4 bg-sand border border-brand-100 rounded-2xl hover:bg-brand-50 transition-all group">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-500 shadow-sm group-hover:scale-110 transition-transform"><Type size={16} /></div>
                      <div className="flex flex-col items-start text-stone-600">
                        <span className="text-xs font-black">Add Body Text</span>
                        <span className="text-[9px] font-bold opacity-50 uppercase">Paragraph Text</span>
                      </div>
                    </button>
                  </div>
                </section>

                {/* Project Config */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Project Details</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-500 ml-1">CONTENT CATEGORY</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-sand border border-brand-100 rounded-xl px-4 py-3 text-xs font-bold text-ink outline-none focus:ring-4 focus:ring-brand-100 transition-all appearance-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-bold text-stone-500 ml-1">SCHEDULE DATE</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-sand border border-brand-100 rounded-xl px-4 py-3 text-xs font-bold text-ink outline-none focus:ring-4 focus:ring-brand-100 transition-all"
                      />
                      <p className="text-[9px] text-stone-400 ml-1">Optional: Set a date to show in the mobile calendar.</p>
                    </div>

                     <div className="flex items-center justify-between p-3 bg-sand rounded-2xl border border-brand-100 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-ink">Hero Section</span>
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Show in top list</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsHeroSection(!isHeroSection)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isHeroSection ? 'bg-brand-500' : 'bg-stone-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isHeroSection ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="p-3 bg-sand rounded-2xl border border-brand-100 mt-2">
                      <div className="flex flex-col mb-2">
                        <span className="text-xs font-black text-ink">Template Type</span>
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Content or Brand Kit Frame</span>
                      </div>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full bg-white border border-brand-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-brand-500/20 transition-all"
                      >
                        <option value="CONTENT">CONTENT TEMPLATE</option>
                        <option value="BRAND_KIT">BRAND KIT FRAME</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              /* LAYERS TAB VIEW - CANVA INSPIRED */
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Canvas Layers</h3>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{layers.length} Total</span>
                </div>

                {layers.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-brand-50 rounded-3xl bg-sand/50">
                    <Layers size={32} className="mb-2 opacity-20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Empty Canvas</span>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={layers}
                    onReorder={handleReorder}
                    className="space-y-3"
                  >
                    {layers.map((layer) => (
                      <LayerRow
                        key={layer.id}
                        layer={layer}
                        canvas={canvas}
                        activeObject={activeObject}
                        syncLayers={syncLayers}
                        finalizeReorder={finalizeReorder}
                        isDragging={isDragging}
                      />
                    ))}
                  </Reorder.Group>
                )}
              </section>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-6 bg-sand border-t border-brand-50 mt-auto">
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => handleManualZoom(zoomLevel - 0.1)} className="flex-1 p-3 bg-white rounded-xl border border-brand-100 text-slate-400 hover:text-ink transition-colors flex justify-center"><ZoomOut size={18} /></button>
              <button onClick={() => zoomToFit(canvas)} className="flex-1 p-3 bg-white rounded-xl border border-brand-100 text-slate-400 hover:text-ink transition-colors flex justify-center"><Maximize size={18} /></button>
              <button onClick={() => handleManualZoom(zoomLevel + 0.1)} className="flex-1 p-3 bg-white rounded-xl border border-brand-100 text-slate-400 hover:text-ink transition-colors flex justify-center"><ZoomIn size={18} /></button>
            </div>
          </div>
        </aside>

        {/* Dynamic Canvas Viewport */}
        <main className="flex-1 relative flex items-center justify-center overflow-auto bg-[#e2e8f0] p-4 sm:p-12" id="canvas-viewport">
          <div
            className="bg-white shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden flex items-center justify-center"
          >
            <canvas id="editor-canvas" />
          </div>

          {/* Contextual Controller - Production Ready */}
          {activeObject && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-ink/90 backdrop-blur-xl text-white p-2 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-500 scale-90 sm:scale-100 overflow-x-auto max-w-[calc(100%-2rem)] touch-pan-x hide-scrollbar">
              {activeObject?.type?.includes('text') && (
                <>
                  {/* Font Family Dropdown */}
                  <div className="flex items-center bg-white/10 rounded-xl px-2 h-[34px]" title="Font Family">
                    <select
                      className="bg-transparent text-white text-xs outline-none cursor-pointer w-24"
                      value={activeObject.fontFamily || 'Inter'}
                      onChange={(e) => {
                        activeObject.set('fontFamily', e.target.value);
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                    >
                      <option value="Inter" className="text-black">Inter</option>
                      <option value="Montserrat" className="text-black">Montserrat</option>
                      <option value="Poppins" className="text-black">Poppins</option>
                      <option value="Roboto" className="text-black">Roboto</option>
                      <option value="Playfair Display" className="text-black">Playfair Display</option>
                      <option value="Oswald" className="text-black">Oswald</option>
                    </select>
                  </div>
                  <div className="w-px h-6 bg-white/10 mx-1" />

                  <div className="flex items-center bg-white/10 rounded-xl px-2 h-[34px]" title="Font Size">
                    <input
                      type="number"
                      className="w-10 bg-transparent text-white text-sm text-center outline-none selection:bg-blue-500/30"
                      style={{ MozAppearance: 'textfield' }}
                      value={Math.round((activeObject.fontSize || 40) * (activeObject.scaleY || 1))}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!val || val < 1) return;
                        activeObject.set({ fontSize: val, scaleX: 1, scaleY: 1 });
                        activeObject.setCoords();
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                    />
                    <span className="text-white/50 text-xs font-semibold">pt</span>
                  </div>
                  <div className="w-px h-6 bg-white/10 mx-1" />

                  {/* Text color — Canva-style, left of Bold */}
                  <label
                    className="relative flex flex-col items-center justify-center w-9 h-[34px] rounded-xl hover:bg-white/10 cursor-pointer shrink-0"
                    title="Text color"
                  >
                    <span className="text-[13px] font-black leading-none text-white">A</span>
                    <span
                      className="mt-[3px] w-4 h-[3px] rounded-sm ring-1 ring-white/25"
                      style={{ backgroundColor: normalizeColor(activeObject.fill) }}
                    />
                    <input
                      type="color"
                      value={normalizeColor(activeObject.fill)}
                      onChange={(e) => applyFillColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0 border-0"
                    />
                  </label>

                  <button onClick={() => { activeObject.set('fontWeight', activeObject.fontWeight === 'bold' ? 'normal' : 'bold'); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all ${activeObject.fontWeight === 'bold' ? 'bg-white text-ink' : 'hover:bg-white/10'}`}><Bold size={16} /></button>
                  <button onClick={() => { activeObject.set('fontStyle', activeObject.fontStyle === 'italic' ? 'normal' : 'italic'); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all ${activeObject.fontStyle === 'italic' ? 'bg-white text-ink' : 'hover:bg-white/10'}`}><Italic size={16} /></button>

                  <button onClick={() => { activeObject.set('uppercase', !activeObject.uppercase); activeObject.set('text', activeObject.uppercase ? activeObject.text.toLowerCase() : activeObject.text.toUpperCase()); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all text-xs font-bold leading-none ${activeObject.uppercase ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Uppercase">Aa</button>

                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button onClick={() => { activeObject.set('textAlign', 'left'); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'left' || !activeObject.textAlign ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Left"><AlignLeft size={16} /></button>
                  <button onClick={() => { activeObject.set('textAlign', 'center'); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'center' ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Center"><AlignCenter size={16} /></button>
                  <button onClick={() => { activeObject.set('textAlign', 'right'); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'right' ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Right"><AlignRight size={16} /></button>
                  <div className="w-px h-6 bg-white/10 mx-1" />

                  {/* Letter Spacing */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 h-[34px]" title="Letter Spacing">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest hidden lg:block">LS</span>
                    <input
                      type="number"
                      min="-200" max="1000" step="10"
                      className="w-10 bg-transparent text-white text-xs text-center outline-none"
                      value={activeObject.charSpacing || 0}
                      onChange={(e) => {
                        activeObject.set('charSpacing', parseInt(e.target.value) || 0);
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                    />
                  </div>

                  {/* Line Height */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 h-[34px]" title="Line Height">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest hidden lg:block">LH</span>
                    <input
                      type="number"
                      min="0.5" max="3" step="0.1"
                      className="w-10 bg-transparent text-white text-xs text-center outline-none"
                      value={activeObject.lineHeight || 1.16}
                      onChange={(e) => {
                        activeObject.set('lineHeight', parseFloat(e.target.value) || 1.16);
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                    />
                  </div>
                  <div className="w-px h-6 bg-white/10 mx-1" />

                  {/* Stroke Control */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 h-[34px]" title="Stroke">
                    <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest hidden xl:block">Stroke</span>
                    <input
                      type="color"
                      value={normalizeColor(activeObject.stroke)}
                      onChange={(e) => {
                        activeObject.set('stroke', e.target.value);
                        if (!activeObject.strokeWidth) activeObject.set('strokeWidth', 2);
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                      className="w-4 h-4 p-0 border-0 rounded cursor-pointer shrink-0"
                      style={{ background: 'transparent' }}
                    />
                    <input
                      type="number"
                      min="0" max="20" step="1"
                      className="w-8 ml-1 bg-transparent text-white text-xs text-center outline-none"
                      value={activeObject.strokeWidth || 0}
                      onChange={(e) => {
                        if (parseInt(e.target.value) > 0 && !activeObject.stroke) {
                          activeObject.set('stroke', '#000000');
                        }
                        activeObject.set('strokeWidth', parseInt(e.target.value) || 0);
                        canvas.renderAll();
                        setIsDirty(true);
                        setRenderTick(t => t + 1);
                      }}
                    />
                  </div>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                </>
              )}

              {/* Opacity Slider for all objects */}
              <div className="flex items-center bg-white/10 rounded-xl px-2 h-[34px] group w-24 hover:w-32 transition-all overflow-hidden shrink-0" title="Opacity">
                <div className="text-[10px] text-white/70 font-bold uppercase leading-none mr-2">
                  {Math.round((activeObject.opacity ?? 1) * 100)}%
                </div>
                <input
                  type="range"
                  min="0.1" max="1" step="0.05"
                  className="w-16 accent-white"
                  value={activeObject.opacity ?? 1}
                  onChange={(e) => {
                    activeObject.set('opacity', parseFloat(e.target.value));
                    canvas.renderAll();
                    setIsDirty(true);
                    setRenderTick(t => t + 1);
                  }}
                />
              </div>
              <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

              <div className="flex gap-1 items-center bg-white/10 rounded-xl px-1 shrink-0">
                <button
                  onClick={() => { canvas.bringToFront(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Bring to Front"
                ><Maximize size={16} className="rotate-45" /></button>
                <button
                  onClick={() => { canvas.bringForward(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Bring Forward"
                ><ChevronUp size={16} /></button>
                <button
                  onClick={() => { canvas.sendBackwards(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Send Backward"
                ><ChevronDown size={16} /></button>
                <button
                  onClick={() => { canvas.sendToBack(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Send to Back"
                ><div className="w-3.5 h-3.5 border-2 border-white/40 rounded-sm" /></button>
              </div>
              <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

              {/* Fill color for shapes / images (text uses the A color control) */}
              {!String(activeObject?.type || '').toLowerCase().includes('text') && (
                <div className="flex items-center gap-2 px-2 group shrink-0" title="Fill color">
                  <div
                    className="w-5 h-5 rounded-full border border-white/20 shadow-inner relative"
                    style={{ backgroundColor: normalizeColor(activeObject.fill) }}
                  >
                    <input
                      type="color"
                      value={normalizeColor(activeObject.fill)}
                      onChange={(e) => applyFillColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0"
                    />
                  </div>
                </div>
              )}

              <div className="w-px h-6 bg-white/10 mx-1" />
              
              {/* Layer Role Selector */}
              <div className="flex items-center bg-white/10 rounded-xl px-2 h-[34px]" title="Layer Role (for Brand Kits)">
                <select
                  className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer w-20 uppercase"
                  value={activeObject.role || 'none'}
                  onChange={(e) => {
                    activeObject.set('role', e.target.value);
                    canvas.renderAll();
                    setIsDirty(true);
                    setRenderTick(t => t + 1);
                  }}
                >
                  <option value="none" className="text-black">None</option>
                  <option value="brandName" className="text-black">Name</option>
                  <option value="brandPhone" className="text-black">Phone</option>
                  <option value="brandLogo" className="text-black">Logo</option>
                  <option value="brandAddress" className="text-black">Address</option>
                  <option value="brandEmail" className="text-black">Email</option>
                </select>
              </div>

              <div className="w-px h-6 bg-white/10 mx-1" />
              <button onClick={deleteSelected} className="p-2 hover:bg-red-500 bg-red-500/10 text-red-500 hover:text-white rounded-xl transition-all duration-300"><Trash2 size={18} /></button>
            </div>
          )}

          {/* Quick Tools (Mobile Friendly Access) */}
          <div className="lg:hidden absolute bottom-6 flex items-center gap-3 bg-white/95 backdrop-blur-md p-3 rounded-[2rem] shadow-2xl border border-brand-100">
            <button type="button" onClick={() => addText('heading')} className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Type size={20} /></button>
            <button type="button" onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white text-ink rounded-full flex items-center justify-center shadow-lg border border-brand-100 active:scale-90 transition-transform"><Layers size={20} /></button>
            <label className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 cursor-pointer active:scale-90 transition-transform relative overflow-hidden">
              <Upload size={20} />
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*" />
            </label>
          </div>
        </main>
      </div>
    </div>
  );
};

// Extracted LayerRow component for cleaner drag state management
const LayerRow = ({ layer, canvas, activeObject, syncLayers, finalizeReorder, isDragging }) => {
  const { obj, preview } = layer;
  const isActive = activeObject === obj;
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={layer}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => finalizeReorder()}
      style={{ touchAction: 'none' }}
      className={`group bg-[#F1F3F4] rounded-xl border-2 transition-all flex items-center gap-0 overflow-hidden cursor-pointer h-20 shadow-sm ${isActive ? 'border-[#8B3DFF] shadow-lg shadow-purple-100' : 'border-transparent hover:border-slate-300'}`}
      onClick={() => {
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }}
    >
      {/* Drag Handle Area */}
      <div
        className="w-8 flex items-center justify-center text-slate-300 group-hover:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing h-full hover:bg-slate-200/50 transition-colors"
        onPointerDown={(e) => {
          isDragging.current = true;
          controls.start(e);
        }}
      >
        <GripVertical size={16} />
      </div>

      {/* Real Preview Area */}
      <div className="flex-1 h-full bg-[#E8EAEB] flex items-center justify-center p-2 relative pointer-events-none select-none">
        {preview ? (
          <img
            src={preview}
            alt="Layer Preview"
            className="max-w-full max-h-full object-contain drop-shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 bg-slate-200 animate-pulse rounded" />
        )}

        {!obj.visible && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <EyeOff size={16} className="text-slate-400" />
          </div>
        )}
      </div>

      {/* Action Buttons Area */}
      <div className={`flex flex-col border-l border-brand-100 w-10 shrink-0 h-full transition-all bg-white opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100' : ''}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const isLocked = !obj.lockMovementX;
            obj.set({
              lockMovementX: isLocked, lockMovementY: isLocked,
              lockScalingX: isLocked, lockScalingY: isLocked,
              lockRotation: isLocked, hasControls: !isLocked
            });
            canvas.renderAll();
            syncLayers();
          }}
          className={`flex-1 flex items-center justify-center hover:bg-sand border-b border-brand-50 ${obj.lockMovementX ? 'text-amber-500' : 'text-slate-400 hover:text-ink'}`}
          title="Lock/Unlock"
        >
          {obj.lockMovementX ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            obj.set('visible', !obj.visible);
            canvas.renderAll();
            syncLayers();
          }}
          className={`flex-1 flex items-center justify-center hover:bg-sand border-b border-brand-50 ${!obj.visible ? 'text-red-500' : 'text-slate-400 hover:text-ink'}`}
          title="Show/Hide"
        >
          {obj.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            canvas.remove(obj);
            canvas.discardActiveObject();
            canvas.renderAll();
            syncLayers();
          }}
          className="flex-1 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Reorder.Item>
  );
};

export default TemplateEditor;
