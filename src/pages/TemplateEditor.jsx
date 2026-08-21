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
  Circle as CircleIcon,
  Minus,
  Triangle,
  Star,
  Pentagon,
  Undo2,
  Redo2,
  ArrowUpRight,
  GripVertical
} from 'lucide-react';
import { Canvas, Textbox, FabricImage, Rect, Circle, Ellipse, Line, Triangle as FabricTriangle, Polygon, Path } from 'fabric';
import { Reorder, useDragControls } from 'framer-motion';
import {
  getTemplate,
  createTemplate,
  updateTemplate,
  listTemplateMedia,
  uploadTemplateImage,
  deleteTemplateMedia,
} from '../services/templatesApi';
import { fetchCategoriesList } from '../services/categoriesApi';
import { initAligningGuidelines } from '../utils/initAligningGuidelines';
import { showError, getErrorMessage } from '../utils/toast';
import { useConfirm } from '../context/ConfirmContext';
import {
  EDITOR_FONT_GROUPS,
  EDITOR_FONTS,
  ensureEditorFontLoaded,
  fontForLanguage,
  normalizeFontName,
  preloadEditorFonts,
} from '../utils/editorFonts';
import {
  TEXT_LANGUAGES,
  convertTextLanguage,
  detectTextLanguage,
  isLatin,
} from '../utils/transliterate';

// Helper to normalize colors for <input type="color">
const normalizeColor = (color) => {
  if (!color) return '#000000';
  if (typeof color !== 'string') return '#000000';
  if (color.startsWith('#')) return color;

  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1).toUpperCase();
    }
  }
  return '#000000';
};

const FABRIC_JSON_PROPS = [
  'id',
  'role',
  'uppercase',
  'selectable',
  'evented',
  'name',
  'lang',
  'latinSource',
];

const SIZE_FROM_KEY = {
  post: { size: 'POST', platform: 'IG' },
  story: { size: 'STORY', platform: 'IG' },
  portrait: { size: 'POST', platform: 'IG' },
  fb_post: { size: 'POST', platform: 'FB' },
  banner: { size: 'BANNER', platform: 'FB' },
  twitter: { size: 'POST', platform: 'X' },
  youtube: { size: 'POST', platform: 'YT' },
  linkedin: { size: 'BANNER', platform: 'LI' },
  custom: { size: 'CUSTOM', platform: 'IG' },
};

const PRESET_BY_SIZE = {
  POST: { width: 1080, height: 1080, ratio: '1:1', key: 'post' },
  STORY: { width: 1080, height: 1920, ratio: '9:16', key: 'story' },
  BANNER: { width: 820, height: 312, ratio: '2.6:1', key: 'banner' },
  CUSTOM: { width: 1080, height: 1080, ratio: '1:1', key: 'custom' },
};

const parseFabricJSON = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
};

const isTextObject = (obj) => String(obj?.type || '').toLowerCase().includes('text');

const createStarPoints = (spikes = 5, outerRadius = 80, innerRadius = 40) => {
  const points = [];
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes; i += 1) {
    points.push({
      x: Math.cos(rot) * outerRadius,
      y: Math.sin(rot) * outerRadius,
    });
    rot += step;
    points.push({
      x: Math.cos(rot) * innerRadius,
      y: Math.sin(rot) * innerRadius,
    });
    rot += step;
  }
  return points;
};

const DEFAULT_SHAPE_FILL = 'transparent';
const DEFAULT_SHAPE_STROKE = '#000000';
const DEFAULT_SHAPE_STROKE_WIDTH = 3;

const SHAPE_OUTLINE_PROPS = {
  fill: DEFAULT_SHAPE_FILL,
  stroke: DEFAULT_SHAPE_STROKE,
  strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
  strokeUniform: true,
};

const isShapeObject = (obj) => {
  const t = String(obj?.type || '').toLowerCase();
  return (
    t.includes('rect') ||
    t.includes('circle') ||
    t.includes('ellipse') ||
    t.includes('triangle') ||
    t.includes('polygon') ||
    t.includes('polyline') ||
    t.includes('path') ||
    t === 'line'
  );
};

const isBlobSrc = (src) => typeof src === 'string' && /^blob:/i.test(src.trim());

const isPersistableSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || isBlobSrc(trimmed)) return false;
  return /^(https?:|data:)/i.test(trimmed);
};

const getSerializedSrc = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  return node.src || node._originalElement?.src || '';
};

const isImageLike = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj === 'string') return isBlobSrc(obj) || isPersistableSrc(obj);
  const type = String(obj.type || '').toLowerCase();
  return type.includes('image') || typeof obj.src === 'string';
};

const collectSalvageUrls = (template) => {
  const urls = [];
  const images = Array.isArray(template?.images) ? template.images : [];
  for (const layer of images) {
    const src = layer.image || layer.url;
    if (isPersistableSrc(src) && !urls.includes(src)) urls.push(src);
  }
  return urls;
};

const IMAGE_RESTORE_KEYS = [
  'id',
  'role',
  'name',
  'left',
  'top',
  'scaleX',
  'scaleY',
  'angle',
  'opacity',
  'originX',
  'originY',
  'flipX',
  'flipY',
  'skewX',
  'skewY',
  'selectable',
  'evented',
  'visible',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'hasControls',
  'cropX',
  'cropY',
  'width',
  'height',
];

const dropOrReplaceTransientImages = (json, salvageUrls = []) => {
  let salvageIndex = 0;
  let skipped = 0;
  let replaced = 0;

  const walkArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => walkNode(item)).filter(Boolean);
  };

  const walkNode = (node) => {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node.objects)) {
      node.objects = walkArray(node.objects);
    }
    if (!isImageLike(node)) return node;

    const src = getSerializedSrc(node);
    if (isPersistableSrc(src)) return node;
    if (salvageIndex < salvageUrls.length) {
      node.src = salvageUrls[salvageIndex++];
      replaced += 1;
      return node;
    }
    skipped += 1;
    return null;
  };

  if (Array.isArray(json.objects)) {
    json.objects = walkArray(json.objects);
  }

  if (json.backgroundImage) {
    const src = getSerializedSrc(json.backgroundImage);
    if (!isPersistableSrc(src)) {
      if (salvageIndex < salvageUrls.length) {
        if (typeof json.backgroundImage === 'string') {
          json.backgroundImage = salvageUrls[salvageIndex++];
        } else {
          json.backgroundImage.src = salvageUrls[salvageIndex++];
        }
        replaced += 1;
      } else {
        delete json.backgroundImage;
        skipped += 1;
      }
    }
  }

  return { skipped, replaced };
};

const loadFabricImage = async (src) => {
  if (!isPersistableSrc(src)) return null;
  try {
    return await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
  } catch {
    try {
      return await FabricImage.fromURL(src);
    } catch (err) {
      console.warn('Failed to load image', src, err);
      return null;
    }
  }
};

const instantiateSerializedImage = async (data) => {
  const src = typeof data === 'string' ? data : getSerializedSrc(data);
  const img = await loadFabricImage(src);
  if (!img) return null;
  if (data && typeof data === 'object') {
    const props = {};
    for (const key of IMAGE_RESTORE_KEYS) {
      if (data[key] !== undefined) props[key] = data[key];
    }
    img.set(props);
    img.setCoords();
  }
  return img;
};

const canvasHasBlobImages = (canvasInstance) => {
  if (!canvasInstance) return false;
  const srcs = [];
  canvasInstance.getObjects().forEach((obj) => {
    const type = String(obj.type || '').toLowerCase();
    if (type.includes('image')) {
      srcs.push(obj.getSrc?.() || obj._element?.src || obj.src || '');
    }
  });
  const bg = canvasInstance.backgroundImage;
  if (bg) srcs.push(bg.getSrc?.() || bg.src || '');
  return srcs.some((src) => isBlobSrc(src));
};

const payloadHasBlobSrcs = (data) => {
  if (!data) return false;
  const images = Array.isArray(data.images) ? data.images : [];
  if (images.some((layer) => isBlobSrc(layer.image || layer.url))) return true;

  const walk = (node) => {
    if (!node) return false;
    if (typeof node === 'string') return isBlobSrc(node);
    if (typeof node !== 'object') return false;
    if (typeof node.src === 'string' && isBlobSrc(node.src)) return true;
    if (node.backgroundImage && walk(node.backgroundImage)) return true;
    if (Array.isArray(node.objects) && node.objects.some(walk)) return true;
    return false;
  };

  return walk(data.fabricJSON);
};

const loadFabricJSONSafely = async (canvasInstance, fabricJSON, options = {}) => {
  const empty = { skipped: 0, replaced: 0 };
  if (!canvasInstance || !fabricJSON) return empty;

  const json = JSON.parse(JSON.stringify(fabricJSON));
  const stats = dropOrReplaceTransientImages(json, options.salvageUrls || []);

  // Preserve original stacking order. Images are restored separately (blob/CORS
  // salvage), but must be re-inserted at their original indices — otherwise every
  // image lands on top and text headings disappear under portraits/backgrounds.
  const allObjects = Array.isArray(json.objects) ? json.objects : [];
  const slots = allObjects.map((obj) => ({
    isImage: isImageLike(obj),
    data: obj,
  }));
  const otherObjects = slots.filter((slot) => !slot.isImage).map((slot) => slot.data);

  const backgroundImage = json.backgroundImage;
  const rest = { ...json, objects: otherObjects };
  delete rest.backgroundImage;

  try {
    await canvasInstance.loadFromJSON(rest);
  } catch (err) {
    console.warn('Non-image JSON load failed, continuing with images', err);
    try {
      await canvasInstance.loadFromJSON({ ...rest, objects: [] });
    } catch {
      canvasInstance.clear();
      canvasInstance.backgroundColor = rest.background || rest.backgroundColor || '#ffffff';
    }
  }

  if (backgroundImage) {
    const bgImg = await instantiateSerializedImage(backgroundImage);
    if (bgImg) canvasInstance.backgroundImage = bgImg;
    else stats.skipped += 1;
  }

  const loadedOthers = canvasInstance.getObjects().slice();
  let otherIndex = 0;
  const orderedObjects = [];

  for (const slot of slots) {
    if (slot.isImage) {
      const img = await instantiateSerializedImage(slot.data);
      if (img) orderedObjects.push(img);
      else stats.skipped += 1;
    } else {
      const obj = loadedOthers[otherIndex++];
      if (obj) orderedObjects.push(obj);
    }
  }

  // Re-apply bottom → top order so text that was saved above images stays above.
  loadedOthers.forEach((obj) => {
    if (obj.canvas === canvasInstance) canvasInstance.remove(obj);
  });
  orderedObjects.forEach((obj) => canvasInstance.add(obj));

  // Templates saved after the old loader had every image appended on top of every
  // text object. Detect that inverted stack and promote text back above images.
  const stacked = canvasInstance.getObjects();
  const textObjs = [];
  let maxTextIdx = -1;
  let minImageIdx = Infinity;
  stacked.forEach((obj, index) => {
    const typeName = String(obj.type || '').toLowerCase();
    if (typeName.includes('text')) {
      textObjs.push(obj);
      maxTextIdx = Math.max(maxTextIdx, index);
    } else if (typeName.includes('image')) {
      minImageIdx = Math.min(minImageIdx, index);
    }
  });
  if (textObjs.length && minImageIdx !== Infinity && maxTextIdx < minImageIdx) {
    textObjs.forEach((obj) => canvasInstance.bringObjectToFront(obj));
  }

  canvasInstance.requestRenderAll();
  return stats;
};

const resolveDesignSize = (template, fallback) => {
  const json = parseFabricJSON(template?.fabricJSON);
  if (json?.width && json?.height) {
    return {
      width: Number(json.width),
      height: Number(json.height),
      ratio: template.ratio || `${json.width}:${json.height}`,
      name: template.size || fallback.name,
    };
  }

  const sizeKey = String(template?.size || '').toUpperCase();
  if (PRESET_BY_SIZE[sizeKey] && sizeKey !== 'CUSTOM') {
    const p = PRESET_BY_SIZE[sizeKey];
    return { width: p.width, height: p.height, ratio: template.ratio || p.ratio, name: sizeKey };
  }

  if (template?.ratio && /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(template.ratio)) {
    const [rw, rh] = template.ratio.split(':').map(Number);
    if (rw > 0 && rh > 0) {
      const width = 1080;
      const height = Math.round((1080 * rh) / rw);
      return { width, height, ratio: template.ratio, name: sizeKey || 'Custom' };
    }
  }

  return {
    width: fallback.width,
    height: fallback.height,
    ratio: template?.ratio || fallback.ratio,
    name: fallback.name,
  };
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
  const [pendingUploads, setPendingUploads] = useState(0);
  const [langBusy, setLangBusy] = useState(false);
  const [sizeOverride, setSizeOverride] = useState(null);

  // Layout & UI State
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'layers'
  const [layers, setLayers] = useState([]);
  const savedIdRef = useRef(id || null);
  const isDragging = useRef(false);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const clipboard = useRef(null);
  const isInternalChange = useRef(false);
  const pendingUploadsRef = useRef(0);
  const langBusyRef = useRef(false);
  const historyBusyRef = useRef(false);
  const syncLayersRef = useRef(() => {});
  const [historyVersion, setHistoryVersion] = useState(0);
  const [historyBusy, setHistoryBusy] = useState(false);



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
      ratio: `${searchParams.get('w') || 1080}:${searchParams.get('h') || 1080}`,
      name: 'Custom Size'
    }
  };

  const currentConfig = sizeOverride || configs[canvasType] || configs.post;

  // --- CORE WORKFLOW & DESIGN TOOLS (Declared early for useEffect dependencies) ---
  const saveHistory = useCallback((canvasInstance = canvas) => {
    if (!canvasInstance || isInternalChange.current) return;
    const json = JSON.stringify(canvasInstance.toJSON(FABRIC_JSON_PROPS));

    // Only push if different from last state to avoid duplicates
    const lastState = undoStack.current[undoStack.current.length - 1];
    if (json !== lastState) {
      undoStack.current.push(json);
      // Limit history size
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current = []; // Clear redo on new action
      setHistoryVersion((v) => v + 1);
    }
  }, [canvas]);

  const undo = useCallback(async () => {
    if (!canvas || historyBusyRef.current || undoStack.current.length <= 1) return;

    historyBusyRef.current = true;
    setHistoryBusy(true);
    isInternalChange.current = true;

    const currentState = undoStack.current.pop();
    redoStack.current.push(currentState);
    const previousState = undoStack.current[undoStack.current.length - 1];

    try {
      canvas.discardActiveObject();
      await loadFabricJSONSafely(canvas, JSON.parse(previousState));
      canvas.requestRenderAll();
      setHistoryVersion((v) => v + 1);
      setActiveObject(null);
      setIsDirty(true);
      setRenderTick((t) => t + 1);
      syncLayersRef.current?.(canvas);
    } catch (err) {
      console.error('Undo failed', err);
      undoStack.current.push(currentState);
      redoStack.current.pop();
      showError('Could not undo that change');
    } finally {
      isInternalChange.current = false;
      historyBusyRef.current = false;
      setHistoryBusy(false);
    }
  }, [canvas]);

  const redo = useCallback(async () => {
    if (!canvas || historyBusyRef.current || redoStack.current.length === 0) return;

    historyBusyRef.current = true;
    setHistoryBusy(true);
    isInternalChange.current = true;

    const nextState = redoStack.current.pop();
    undoStack.current.push(nextState);

    try {
      canvas.discardActiveObject();
      await loadFabricJSONSafely(canvas, JSON.parse(nextState));
      canvas.requestRenderAll();
      setHistoryVersion((v) => v + 1);
      setActiveObject(null);
      setIsDirty(true);
      setRenderTick((t) => t + 1);
      syncLayersRef.current?.(canvas);
    } catch (err) {
      console.error('Redo failed', err);
      undoStack.current.pop();
      redoStack.current.push(nextState);
      showError('Could not redo that change');
    } finally {
      isInternalChange.current = false;
      historyBusyRef.current = false;
      setHistoryBusy(false);
    }
  }, [canvas]);

  const canUndo = !historyBusy && historyVersion >= 0 && undoStack.current.length > 1;
  const canRedo = !historyBusy && historyVersion >= 0 && redoStack.current.length > 0;

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
    let width = Math.min(720, currentConfig.width * 0.7);

    if (textType === 'subheading') {
      fontSize = 50;
      content = 'Subheading';
      width = Math.min(640, currentConfig.width * 0.65);
    } else if (textType === 'body') {
      fontSize = 32;
      fontWeight = 'normal';
      content = 'Tap to edit text...';
      width = Math.min(560, currentConfig.width * 0.6);
    }

    // Textbox (not IText) so textAlign left/center/right actually applies inside a fixed width
    const text = new Textbox(content, {
      id: generateId(),
      role:
        textType === 'heading' ? 'title' : textType === 'subheading' ? 'subtitle' : 'none',
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontFamily: 'Inter',
      fill: '#000000',
      width,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      lang: 'en',
      latinSource: content,
    });

    canvas.add(text);
    canvas.bringObjectToFront(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, [canvas, currentConfig]);

  const placeShapeOnCanvas = useCallback((shape) => {
    if (!canvas || !shape) return;
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
    setActiveObject(shape);
    setIsDirty(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, [canvas]);

  const addRect = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new Rect({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      width: 220,
      height: 160,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addCircle = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new Circle({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      radius: 100,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addEllipse = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new Ellipse({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      rx: 120,
      ry: 80,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addTriangle = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new FabricTriangle({
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      width: 200,
      height: 180,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addStar = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new Polygon(createStarPoints(5, 90, 42), {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addPolygon = useCallback(() => {
    if (!canvas) return;
    const r = 95;
    const sides = 6;
    const points = Array.from({ length: sides }, (_, i) => {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    });
    placeShapeOnCanvas(new Polygon(points, {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addLine = useCallback(() => {
    if (!canvas) return;
    placeShapeOnCanvas(new Line([0, 0, 240, 0], {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      stroke: DEFAULT_SHAPE_STROKE,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      fill: '',
      originX: 'center',
      originY: 'center',
      strokeUniform: true,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const addArrow = useCallback(() => {
    if (!canvas) return;
    // Outline arrow — transparent inside, black border (Paint-style)
    placeShapeOnCanvas(new Path('M 0 28 L 150 28 L 150 8 L 220 40 L 150 72 L 150 52 L 0 52 Z', {
      id: generateId(),
      left: currentConfig.width / 2,
      top: currentConfig.height / 2,
      originX: 'center',
      originY: 'center',
      ...SHAPE_OUTLINE_PROPS,
    }));
  }, [canvas, currentConfig, placeShapeOnCanvas]);

  const deleteSelected = useCallback(() => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setActiveObject(null);
  }, [canvas, activeObject]);

  const applyTextAlign = useCallback((align) => {
    if (!canvas || !activeObject || !isTextObject(activeObject)) return;
    const obj = activeObject;
    const typeName = String(obj.type || '').toLowerCase();

    // Textbox needs a usable width for left/center/right to be visible
    if (typeName.includes('textbox')) {
      const minW = Math.max(obj.width || 0, Math.round((obj.fontSize || 32) * 8));
      if ((obj.width || 0) < minW) obj.set('width', minW);
    } else if ((obj.width || 0) < 200) {
      // Legacy IText: give it a box so alignment shows for multi-line / wrapped content
      obj.set('width', Math.max(240, Math.round((obj.fontSize || 32) * 10)));
    }

    obj.set('textAlign', align);
    if (typeof obj.initDimensions === 'function') obj.initDimensions();
    obj.setCoords();
    canvas.requestRenderAll();
    setIsDirty(true);
    setRenderTick((t) => t + 1);
    saveHistory(canvas);
  }, [canvas, activeObject, saveHistory]);

  const applyShapeScale = useCallback((factor) => {
    if (!canvas || !activeObject || isTextObject(activeObject)) return;
    const sx = Math.max(0.15, Math.min(4, (activeObject.scaleX || 1) * factor));
    const sy = Math.max(0.15, Math.min(4, (activeObject.scaleY || 1) * factor));
    activeObject.set({ scaleX: sx, scaleY: sy });
    activeObject.setCoords();
    canvas.requestRenderAll();
    setIsDirty(true);
    setRenderTick((t) => t + 1);
    saveHistory(canvas);
  }, [canvas, activeObject, saveHistory]);

  const applyFillColor = useCallback(
    (color) => {
      if (!canvas || !activeObject || !color) return;
      const obj = activeObject;
      const typeName = String(obj.type || '').toLowerCase();
      const isText = typeName.includes('text');

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
      } else if (isShapeObject(obj)) {
        // Paint-style shapes: color controls the border, keep fill transparent
        obj.set({
          stroke: color,
          fill: 'transparent',
          strokeWidth: Math.max(obj.strokeWidth || 0, DEFAULT_SHAPE_STROKE_WIDTH),
          strokeUniform: true,
        });
      } else {
        obj.set('fill', color);
      }

      canvas.renderAll();
      setIsDirty(true);
      setRenderTick((t) => t + 1);
      saveHistory(canvas);
    },
    [canvas, activeObject, saveHistory]
  );

  const applyShapeStrokeColor = useCallback(
    (color) => {
      if (!canvas || !activeObject || !color || !isShapeObject(activeObject)) return;
      activeObject.set({
        stroke: color,
        fill: 'transparent',
        strokeWidth: Math.max(activeObject.strokeWidth || 0, DEFAULT_SHAPE_STROKE_WIDTH),
        strokeUniform: true,
      });
      canvas.renderAll();
      setIsDirty(true);
      setRenderTick((t) => t + 1);
      saveHistory(canvas);
    },
    [canvas, activeObject, saveHistory]
  );

  const refreshTextObject = useCallback((obj, canvasInstance = canvas) => {
    if (!obj || !canvasInstance) return;
    obj.dirty = true;
    if (typeof obj.initDimensions === 'function') obj.initDimensions();
    obj.setCoords();
    canvasInstance.requestRenderAll();
  }, [canvas]);

  const applyCanvasFont = useCallback(async (obj, fontFamily, canvasInstance = canvas) => {
    if (!obj || !fontFamily) return;
    const name = await ensureEditorFontLoaded(fontFamily);
    const meta = EDITOR_FONTS.find((font) => font.name === name);
    const weights = meta?.weights || [400, 700];
    const wantsBold = String(obj.fontWeight) === 'bold' || Number(obj.fontWeight) >= 600;
    const nextWeight = wantsBold && weights.includes(700) ? 'bold' : 'normal';
    obj.set({ fontFamily: name, fontWeight: nextWeight });
    refreshTextObject(obj, canvasInstance);
    setIsDirty(true);
    setRenderTick((t) => t + 1);
  }, [canvas, refreshTextObject]);

  const applyTextLanguage = useCallback(async (targetLang) => {
    if (!canvas || !activeObject) return;
    const typeName = String(activeObject.type || '').toLowerCase();
    if (!typeName.includes('text')) return;
    if (langBusyRef.current) return;

    const currentText = activeObject.text || '';
    const currentLang = activeObject.lang || detectTextLanguage(currentText);
    if (targetLang === currentLang && targetLang !== 'en' && !isLatin(currentText)) return;

    setLangBusy(true);
    langBusyRef.current = true;
    try {
      if (isLatin(currentText)) {
        activeObject.set('latinSource', currentText);
      } else if (!activeObject.latinSource && currentLang === 'en') {
        activeObject.set('latinSource', currentText);
      }

      const nextText = await convertTextLanguage(
        currentText,
        targetLang,
        activeObject.latinSource || ''
      );

      const nextFont = fontForLanguage(targetLang, activeObject.fontFamily);
      await ensureEditorFontLoaded(nextFont);

      activeObject.set({
        text: nextText,
        lang: targetLang,
        fontFamily: nextFont,
        uppercase: targetLang === 'en' ? activeObject.uppercase : false,
      });
      refreshTextObject(activeObject, canvas);
      setIsDirty(true);
      setRenderTick((t) => t + 1);
    } catch (err) {
      console.error('Language convert failed', err);
      showError('Could not convert text language');
    } finally {
      langBusyRef.current = false;
      setLangBusy(false);
    }
  }, [canvas, activeObject, refreshTextObject]);

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

  const zoomToFit = useCallback((canvasInstance, sizeHint) => {
    const container = document.getElementById('canvas-viewport');
    if (!container || !canvasInstance) return;

    const designW = sizeHint?.width || currentConfig.width;
    const designH = sizeHint?.height || currentConfig.height;

    // Extra padding so the template never sits under the properties dock
    const pad = 80;
    const availableWidth = Math.max(container.clientWidth - pad, 200);
    const availableHeight = Math.max(container.clientHeight - pad, 200);

    const scaleX = availableWidth / designW;
    const scaleY = availableHeight / designH;
    const finalScale = Math.min(scaleX, scaleY, 1);
    const safeScale = Math.max(finalScale, 0.08);

    canvasInstance.setZoom(safeScale);
    canvasInstance.setDimensions({
      width: designW * safeScale,
      height: designH * safeScale,
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
  syncLayersRef.current = syncLayers;

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
    preloadEditorFonts();
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

    initCanvas.on('editing:exited', (e) => {
      const obj = e.target;
      if (!obj) return;
      const typeName = String(obj.type || '').toLowerCase();
      if (!typeName.includes('text')) return;
      if (isLatin(obj.text)) obj.set('latinSource', obj.text);
      if (!obj.lang) obj.set('lang', detectTextLanguage(obj.text));
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
    } else {
      // Baseline history so the first add/delete can be undone (Canva-style)
      undoStack.current = [JSON.stringify(initCanvas.toJSON(FABRIC_JSON_PROPS))];
      redoStack.current = [];
      setHistoryVersion((v) => v + 1);
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
        if (!historyBusyRef.current) undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((isMod && e.shiftKey && e.key === 'z') || (isMod && e.key === 'y')) {
        e.preventDefault();
        if (!historyBusyRef.current) redo();
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
          if (e.shiftKey) canvas.bringObjectToFront(activeObj); else canvas.bringObjectForward(activeObj);
          canvas.renderAll();
        }
        if (e.key === '[') {
          e.preventDefault();
          if (e.shiftKey) canvas.sendObjectToBack(activeObj); else canvas.sendObjectBackwards(activeObj);
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
      const items = await listTemplateMedia();
      setMediaLibrary(items);
    } catch (err) {
      console.error('Error fetching media library:', err);
    } finally {
      setIsMediaLoading(false);
    }
  };

  const rebuildCanvasFromLayers = async (canvasInstance, template, design) => {
    canvasInstance.clear();
    canvasInstance.backgroundColor = template.baseColor || '#ffffff';

    const images = Array.isArray(template.images) ? template.images : [];
    const texts = [];
    if (template.title?.text) texts.push({ ...template.title, role: template.title.role || 'title' });
    if (template.subtitle?.text) texts.push({ ...template.subtitle, role: template.subtitle.role || 'subtitle' });
    if (Array.isArray(template.textLayers)) texts.push(...template.textLayers);

    // Build a single stack sorted by zIndex so text can sit above images.
    const stack = [
      ...images.map((layer) => ({ kind: 'image', layer, z: layer.zIndex ?? -1 })),
      ...texts.map((layer) => ({ kind: 'text', layer, z: layer.zIndex ?? 999 })),
    ].sort((a, b) => a.z - b.z);

    for (const item of stack) {
      if (item.kind === 'image') {
        const layer = item.layer;
        const src = layer.image || layer.url;
        if (!isPersistableSrc(src)) continue;
        const img = await loadFabricImage(src);
        if (!img) continue;
        const targetW = (layer.width || 1) * design.width;
        const targetH = (layer.height || 1) * design.height;
        const scale = Math.min(
          targetW / (img.width || 1),
          targetH / (img.height || 1)
        );
        img.set({
          id: generateId(),
          role: layer.role || (layer.isBackground ? 'background' : 'none'),
          originX: 'center',
          originY: 'center',
          left: (layer.x ?? 0.5) * design.width,
          top: (layer.y ?? 0.5) * design.height,
          scaleX: scale,
          scaleY: scale,
          angle: layer.angle || 0,
          opacity: layer.opacity ?? 1,
          name: layer.isBackground ? 'background' : undefined,
        });
        canvasInstance.add(img);
      } else {
        const t = item.layer;
        const textWidth = Math.max(
          120,
          (t.width || 0.5) * design.width
        );
        const text = new Textbox(t.text || '', {
          id: generateId(),
          role: t.role || 'none',
          left: (t.x ?? 0.5) * design.width,
          top: (t.y ?? 0.5) * design.height,
          originX: 'center',
          originY: 'center',
          fontSize: t.size || 32,
          fontFamily: t.font || 'Inter',
          fill: t.color || '#000000',
          fontWeight: t.bold ? 'bold' : 'normal',
          fontStyle: t.italic ? 'italic' : 'normal',
          textAlign: t.textAlign || t.alignment || 'center',
          width: textWidth,
          charSpacing: t.letterSpacing || 0,
          lineHeight: t.lineHeight || 1.16,
          angle: t.angle || 0,
          opacity: t.opacity ?? 1,
          stroke: t.strokeColor || undefined,
          strokeWidth: t.strokeWidth || 0,
          uppercase: !!t.uppercase,
          lang: detectTextLanguage(t.text || ''),
          latinSource: isLatin(t.text) ? t.text : '',
        });
        if (t.uppercase && text.text) text.set('text', String(text.text).toUpperCase());
        canvasInstance.add(text);
      }
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
      const template = await getTemplate(templateId);
      if (!template?._id) {
        showError(template?.message || 'Template not found');
        navigate('/templates');
        return;
      }

      savedIdRef.current = template._id;
      setTemplateName(template.name || 'Untitled Template');
      setCategory(template.category || 'General');
      setCategoryId(template.categoryId?._id || template.categoryId || '');
      setIsHeroSection(!!template.isHeroSection);
      if (template.scheduledDate) {
        setScheduledDate(new Date(template.scheduledDate).toISOString().split('T')[0]);
      } else {
        setScheduledDate('');
      }
      setTemplateType(template.type || 'CONTENT');

      const fallback = configs[canvasType] || configs.post;
      const design = resolveDesignSize(template, fallback);
      setSizeOverride({
        width: design.width,
        height: design.height,
        ratio: design.ratio,
        name: design.name || fallback.name,
      });

      if (!canvasInstance?.contextContainer) {
        console.warn('Canvas disposed before template could load.');
        return;
      }

      isInternalChange.current = true;
      canvasInstance.setZoom(1);
      canvasInstance.setDimensions({ width: design.width, height: design.height });

      const fabricJSON = parseFabricJSON(template.fabricJSON);
      const hasObjects = Array.isArray(fabricJSON?.objects) && fabricJSON.objects.length > 0;
      let repaired = false;

      if (hasObjects || fabricJSON?.background || fabricJSON?.backgroundImage) {
        try {
          const stats = await loadFabricJSONSafely(canvasInstance, fabricJSON, {
            salvageUrls: collectSalvageUrls(template),
          });
          if (stats.skipped > 0 || stats.replaced > 0) repaired = true;
          if (stats.skipped > 0) {
            showError('Some images could not be restored. Re-add them from the media library, then save.');
          }
        } catch (jsonErr) {
          console.warn('Fabric JSON load failed, rebuilding from layers', jsonErr);
          await rebuildCanvasFromLayers(canvasInstance, template, design);
        }
      } else {
        await rebuildCanvasFromLayers(canvasInstance, template, design);
      }

      if (
        canvasInstance.getObjects().length === 0 &&
        ((Array.isArray(template.images) && template.images.some((layer) => isPersistableSrc(layer.image || layer.url))) ||
          template.title?.text ||
          template.subtitle?.text ||
          (Array.isArray(template.textLayers) && template.textLayers.length))
      ) {
        await rebuildCanvasFromLayers(canvasInstance, template, design);
      }

      for (const obj of canvasInstance.getObjects()) {
        if (!obj.id) obj.id = generateId();
        const typeName = String(obj.type || '').toLowerCase();
        if (!typeName.includes('text')) continue;
        if (!obj.lang) obj.lang = detectTextLanguage(obj.text);
        await ensureEditorFontLoaded(obj.fontFamily || 'Inter');
        obj.dirty = true;
        if (typeof obj.initDimensions === 'function') obj.initDimensions();
        obj.setCoords();
      }

      canvasInstance.requestRenderAll();
      syncLayers(canvasInstance);
      undoStack.current = [JSON.stringify(canvasInstance.toJSON(FABRIC_JSON_PROPS))];
      redoStack.current = [];
      setHistoryVersion((v) => v + 1);
      isInternalChange.current = false;

      setTimeout(() => zoomToFit(canvasInstance, design), 50);
      setTimeout(() => {
        zoomToFit(canvasInstance, design);
        syncLayers(canvasInstance);
      }, 200);

      setIsDirty(repaired);
    } catch (err) {
      console.error('Error loading template:', err);
      showError(getErrorMessage(err, 'Failed to load template'));
      isInternalChange.current = false;
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
    let img = null;
    pendingUploadsRef.current += 1;
    setPendingUploads(pendingUploadsRef.current);

    try {
      setLoading(true);
      setUploadProgress(1);

      img = await placeImageOnCanvas(localUrl, canvas);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);

      const uploaded = await uploadTemplateImage(file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(progress);
      });

      const imageUrl =
        uploaded?.url ||
        uploaded?.imageUrl ||
        uploaded?.data?.url ||
        uploaded?.data?.imageUrl;

      if (!imageUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }

      let swappedToServer = false;
      try {
        await img.setSrc(imageUrl, { crossOrigin: 'anonymous' });
        swappedToServer = true;
      } catch {
        try {
          await img.setSrc(imageUrl);
          swappedToServer = true;
        } catch {
          const props = {
            left: img.left,
            top: img.top,
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            angle: img.angle,
            opacity: img.opacity,
            originX: img.originX,
            originY: img.originY,
            id: img.id,
            role: img.role,
          };
          canvas.remove(img);
          const replacement = await placeImageOnCanvas(imageUrl, canvas);
          if (!replacement) throw new Error('Could not attach uploaded image to the canvas');
          replacement.set(props);
          replacement.setCoords();
          img = replacement;
          swappedToServer = true;
        }
      }

      if (!swappedToServer) {
        throw new Error('Could not attach uploaded image to the canvas');
      }

      img.setCoords();
      canvas.requestRenderAll();
      setIsDirty(true);
      undoStack.current = undoStack.current.map((state) => state.split(localUrl).join(imageUrl));
      redoStack.current = redoStack.current.map((state) => state.split(localUrl).join(imageUrl));
      URL.revokeObjectURL(localUrl);
      fetchMediaLibrary();
    } catch (err) {
      console.error('Upload failed:', err);
      if (img) {
        canvas.remove(img);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setActiveObject(null);
      }
      URL.revokeObjectURL(localUrl);
      showError(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      pendingUploadsRef.current = Math.max(0, pendingUploadsRef.current - 1);
      setPendingUploads(pendingUploadsRef.current);
      setIsMediaLoading(false);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const addFromLibrary = async (imageUrl) => {
    if (!canvas || !imageUrl) return;
    if (!isPersistableSrc(imageUrl)) {
      showError('This image cannot be added. Upload it again.');
      return;
    }
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
      await deleteTemplateMedia(id);
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
    let title = null;
    let subtitle = null;

    const baseWidth = currentConfig.width;
    const baseHeight = currentConfig.height;
    const sizeMeta = SIZE_FROM_KEY[canvasType] || SIZE_FROM_KEY.post;

    const bgImage = canvas.backgroundImage;
    const bgSrc = bgImage?.getSrc?.() || bgImage?.src;
    if (bgImage && isPersistableSrc(bgSrc)) {
      images.push({
        image: bgSrc,
        fit: 'cover',
        type: 'background',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        scale: 1,
        angle: 0,
        opacity: 1,
        zIndex: -1,
        isBackground: true,
        role: 'background',
      });
    }

    objects.forEach((obj, index) => {
      const center = obj.getCenterPoint();
      const x = center.x / baseWidth;
      const y = center.y / baseHeight;

      const originalAngle = obj.angle || 0;
      obj.set('angle', 0);
      obj.setCoords();

      const typeName = String(obj.type || '').toLowerCase();
      const width =
        (typeName.includes('text') ? obj.width * obj.scaleX : obj.getScaledWidth()) / baseWidth;
      const height =
        (typeName.includes('text') ? obj.height * obj.scaleY : obj.getScaledHeight()) / baseHeight;

      obj.set('angle', originalAngle);
      obj.setCoords();

      const opacity = obj.opacity ?? 1;
      const zIndex = index;
      const isForcedBackground = obj.id === 'background' || obj.name === 'background';

      if (typeName.includes('image')) {
        const imageSrc = obj.getSrc?.() || obj._element?.src || obj.src;
        if (!isPersistableSrc(imageSrc)) return;
        images.push({
          image: imageSrc,
          fit: 'contain',
          type: isForcedBackground ? 'background' : 'image',
          x,
          y,
          width,
          height,
          scale: obj.scaleX || 1,
          angle: originalAngle,
          opacity,
          zIndex,
          isBackground: isForcedBackground,
          role: obj.role || (isForcedBackground ? 'background' : 'none'),
        });
      } else if (typeName.includes('text')) {
        const layer = {
          text: obj.text,
          font: obj.fontFamily || 'Inter',
          size: Math.round((obj.fontSize || 32) * (obj.scaleY || 1)),
          sizeRatio: ((obj.fontSize || 32) * (obj.scaleY || 1)) / baseWidth,
          color: typeof obj.fill === 'string' ? obj.fill : '#000000',
          x,
          y,
          width,
          height,
          angle: originalAngle,
          opacity,
          zIndex,
          bold: obj.fontWeight === 'bold' || obj.fontWeight === 700 || obj.fontWeight === '700',
          italic: obj.fontStyle === 'italic',
          alignment: obj.textAlign || 'left',
          textAlign: obj.textAlign || 'left',
          letterSpacing: obj.charSpacing || 0,
          lineHeight: obj.lineHeight || 1.16,
          uppercase: !!obj.uppercase,
          strokeColor: obj.stroke || '#000000',
          strokeWidth: obj.strokeWidth || 0,
          role: obj.role || 'none',
        };

        if (layer.role === 'title' && !title) title = layer;
        else if (layer.role === 'subtitle' && !subtitle) subtitle = layer;
        else textLayers.push(layer);
      }
    });

    // If no explicit title role, promote first text layer for mobile clients
    if (!title && textLayers.length) {
      title = { ...textLayers[0], role: 'title' };
      textLayers.shift();
    }
    if (!subtitle && textLayers.length) {
      subtitle = { ...textLayers[0], role: 'subtitle' };
      textLayers.shift();
    }

    const fabricJSON = canvas.toJSON(FABRIC_JSON_PROPS);
    fabricJSON.width = baseWidth;
    fabricJSON.height = baseHeight;
    dropOrReplaceTransientImages(fabricJSON);

    return {
      name: templateName || 'Untitled Template',
      type: templateType || 'CONTENT',
      category: category || 'General',
      categoryId: categoryId || undefined,
      isHeroSection: !!isHeroSection,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      baseColor: canvas.backgroundColor || '#FFFFFF',
      defaultText: title?.text || textLayers[0]?.text || '',
      size: sizeOverride?.name && PRESET_BY_SIZE[String(sizeOverride.name).toUpperCase()]
        ? String(sizeOverride.name).toUpperCase()
        : sizeMeta.size,
      ratio: currentConfig.ratio,
      platform: sizeMeta.platform,
      images,
      title: title || undefined,
      subtitle: subtitle || undefined,
      textLayers,
      fabricJSON,
    };
  };

  const saveTemplate = async () => {
    if (pendingUploadsRef.current > 0) {
      showError('Wait for the image upload to finish before saving.');
      return;
    }
    if (canvasHasBlobImages(canvas)) {
      showError('Wait for the image upload to finish before saving.');
      return;
    }

    const data = normalizeTemplate();
    if (!data) return;

    if (payloadHasBlobSrcs(data)) {
      showError('Wait for the image upload to finish before saving.');
      return;
    }

    if (!data.name?.trim()) {
      showError('Template name is required');
      return;
    }

    const thumbnail = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.8,
      multiplier: 0.8,
    });
    data.thumbnail = thumbnail;

    try {
      setLoading(true);
      const templateId = savedIdRef.current || id;

      if (templateId) {
        const updated = await updateTemplate(templateId, data);
        savedIdRef.current = updated?._id || templateId;
        if (updated?.name) setTemplateName(updated.name);
        if (updated?.category) setCategory(updated.category);
        if (updated?.type) setTemplateType(updated.type);
        setIsDirty(false);
      } else {
        const created = await createTemplate(data);
        const newId = created?._id;
        if (!newId) {
          showError(created?.message || 'Create succeeded but no _id returned');
          return;
        }
        savedIdRef.current = newId;
        setIsDirty(false);
        navigate(`/templates/edit/${newId}`, { replace: true });
      }
    } catch (err) {
      console.error('Save failed:', err);
      showError(getErrorMessage(err, 'Failed to save template'));
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
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-sand px-1.5 py-1 rounded-xl border border-brand-100">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 text-stone-500 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 size={16} />
            </button>
          </div>

          {/* Desktop Zoom */}
          <div className="hidden md:flex items-center gap-2 bg-sand px-3 py-1.5 rounded-xl border border-brand-100">
            <button type="button" onClick={() => handleManualZoom(zoomLevel - 0.1)} className="text-stone-400 hover:text-ink transition-colors"><ZoomOut size={16} /></button>
            <span className="text-[10px] font-black text-stone-700 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button type="button" onClick={() => handleManualZoom(zoomLevel + 0.1)} className="text-stone-400 hover:text-ink transition-colors"><ZoomIn size={16} /></button>
          </div>

          <button
            type="button"
            onClick={saveTemplate}
            disabled={loading || pendingUploads > 0}
            className="bg-brand-500 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <Save size={16} className="hidden sm:inline" />
            {pendingUploads > 0 ? 'Uploading…' : loading ? '...' : 'Save'}
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

                {/* Shapes */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Shapes</h3>
                  <p className="text-[10px] text-stone-400 -mt-2">Outline only (like Paint) — transparent inside, black border. Change border color from the top toolbar.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Rectangle', icon: Square, action: addRect },
                      { label: 'Line', icon: Minus, action: addLine },
                      { label: 'Arrow', icon: ArrowUpRight, action: addArrow },
                      { label: 'Ellipse', icon: CircleIcon, action: addEllipse },
                      { label: 'Polygon', icon: Pentagon, action: addPolygon },
                      { label: 'Star', icon: Star, action: addStar },
                      { label: 'Triangle', icon: Triangle, action: addTriangle },
                      { label: 'Circle', icon: CircleIcon, action: addCircle },
                    ].map((shape) => (
                      <button
                        key={shape.label}
                        type="button"
                        onClick={shape.action}
                        title={shape.label}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 bg-sand border border-brand-100 rounded-2xl hover:bg-brand-50 hover:border-brand-300 transition-all text-stone-600"
                      >
                        <shape.icon size={18} strokeWidth={2} />
                        <span className="text-[9px] font-bold uppercase tracking-wide">{shape.label}</span>
                      </button>
                    ))}
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

        {/* Dynamic Canvas Viewport — toolbar docked above, never overlays template */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#e2e8f0]">
          {/* Properties dock: undo/redo always visible (Canva-style); object tools when selected */}
          <div className="shrink-0 z-20 flex items-center justify-center px-3 sm:px-6 pt-3 pb-3 min-h-[4rem]">
            <div className="flex items-center gap-1.5 bg-ink/90 backdrop-blur-xl text-white p-2 rounded-2xl shadow-2xl scale-90 sm:scale-100 overflow-x-auto max-w-[min(960px,calc(100%-1rem))] touch-pan-x hide-scrollbar border border-white/10">
              {/* Undo / Redo — always available */}
              <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  aria-label="Undo"
                  className="p-2 rounded-lg transition-all hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent active:scale-95"
                >
                  <Undo2 size={18} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Shift+Z)"
                  aria-label="Redo"
                  className="p-2 rounded-lg transition-all hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent active:scale-95"
                >
                  <Redo2 size={18} strokeWidth={2.25} />
                </button>
              </div>

              {activeObject && (
                <>
                  <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
                  {activeObject?.type?.includes('text') && (
                  <>
                    {/* Font Family Dropdown */}
                    <div className="flex items-center bg-white/10 rounded-xl px-2 h-[34px]" title="Font Family">
                      <select
                        className="bg-transparent text-white text-xs outline-none cursor-pointer w-40"
                        value={normalizeFontName(activeObject.fontFamily)}
                        onChange={(e) => {
                          applyCanvasFont(activeObject, e.target.value);
                        }}
                      >
                        {EDITOR_FONT_GROUPS.map((group) => (
                          <optgroup key={group.group} label={group.group} className="text-black">
                            {group.fonts.map((font) => (
                              <option key={font.name} value={font.name} className="text-black">
                                {font.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        {!EDITOR_FONTS.some((font) => font.name === normalizeFontName(activeObject.fontFamily)) && (
                          <option value={normalizeFontName(activeObject.fontFamily)} className="text-black">
                            {normalizeFontName(activeObject.fontFamily)}
                          </option>
                        )}
                      </select>
                    </div>
                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <div className="flex items-center bg-white/10 rounded-xl p-0.5 h-[34px] shrink-0" title="Text language">
                      {TEXT_LANGUAGES.map((lang) => {
                        const currentLang = activeObject.lang || detectTextLanguage(activeObject.text);
                        const selected = currentLang === lang.id;
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            disabled={langBusy}
                            title={lang.title}
                            onClick={() => applyTextLanguage(lang.id)}
                            className={`px-2 h-7 rounded-lg text-[10px] font-black transition-all disabled:opacity-50 ${
                              selected ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            {langBusy && selected ? '…' : lang.label}
                          </button>
                        );
                      })}
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
                    <button type="button" onClick={() => applyTextAlign('left')} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'left' || !activeObject.textAlign ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Left"><AlignLeft size={16} /></button>
                    <button type="button" onClick={() => applyTextAlign('center')} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'center' ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Center"><AlignCenter size={16} /></button>
                    <button type="button" onClick={() => applyTextAlign('right')} className={`p-2 rounded-xl transition-all ${activeObject.textAlign === 'right' ? 'bg-white text-ink' : 'hover:bg-white/10'}`} title="Align Right"><AlignRight size={16} /></button>
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
                    onClick={() => { canvas.bringObjectToFront(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); syncLayers(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Bring to Front"
                  ><Maximize size={16} className="rotate-45" /></button>
                  <button
                    onClick={() => { canvas.bringObjectForward(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); syncLayers(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Bring Forward"
                  ><ChevronUp size={16} /></button>
                  <button
                    onClick={() => { canvas.sendObjectBackwards(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); syncLayers(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Send Backward"
                  ><ChevronDown size={16} /></button>
                  <button
                    onClick={() => { canvas.sendObjectToBack(activeObject); canvas.renderAll(); setIsDirty(true); setRenderTick(t => t + 1); syncLayers(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Send to Back"
                  ><div className="w-3.5 h-3.5 border-2 border-white/40 rounded-sm" /></button>
                </div>
                <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

                {/* Shape resize + border color / image fill */}
                {!String(activeObject?.type || '').toLowerCase().includes('text') && (
                  <>
                    {isShapeObject(activeObject) && (
                      <>
                        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-1 h-[34px] shrink-0" title="Resize shape">
                          <button
                            type="button"
                            onClick={() => applyShapeScale(0.85)}
                            className="px-2 h-7 rounded-lg text-[10px] font-black hover:bg-white/10"
                            title="Make smaller"
                          >
                            S
                          </button>
                          <button
                            type="button"
                            onClick={() => applyShapeScale(1.15)}
                            className="px-2 h-7 rounded-lg text-[10px] font-black hover:bg-white/10"
                            title="Make larger"
                          >
                            L
                          </button>
                        </div>
                        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
                        <div className="flex items-center gap-1.5 px-2 h-[34px] bg-white/10 rounded-xl shrink-0" title="Border color">
                          <span className="text-[9px] font-bold text-white/60 uppercase hidden sm:inline">Border</span>
                          <div
                            className="w-5 h-5 rounded-full border border-white/30 shadow-inner relative"
                            style={{ backgroundColor: normalizeColor(activeObject.stroke || DEFAULT_SHAPE_STROKE) }}
                          >
                            <input
                              type="color"
                              value={normalizeColor(activeObject.stroke || DEFAULT_SHAPE_STROKE)}
                              onChange={(e) => applyShapeStrokeColor(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {!isShapeObject(activeObject) && (
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
                  </>
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
                </>
              )}
            </div>
          </div>

          {/* Canvas stage — clear gap under the black tab */}
          <div
            id="canvas-viewport"
            className="flex-1 min-h-0 relative flex items-center justify-center overflow-auto px-4 sm:px-10 pt-2 sm:pt-4 pb-24 lg:pb-10"
          >
            <div className="bg-white shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden flex items-center justify-center">
              <canvas id="editor-canvas" />
            </div>

            {/* Quick Tools (Mobile Friendly Access) */}
            <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-md p-3 rounded-[2rem] shadow-2xl border border-brand-100">
              <button type="button" onClick={() => addText('heading')} className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Type size={20} /></button>
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white text-ink rounded-full flex items-center justify-center shadow-lg border border-brand-100 active:scale-90 transition-transform"><Layers size={20} /></button>
              <label className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 cursor-pointer active:scale-90 transition-transform relative overflow-hidden">
                <Upload size={20} />
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*" />
              </label>
            </div>
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
