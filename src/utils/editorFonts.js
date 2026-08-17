const FONT_STYLESHEET_ID = 'editor-canvas-fonts';

export const EDITOR_FONTS = [
  { name: 'Inter', label: 'Inter', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Poppins', label: 'Poppins', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Montserrat', label: 'Montserrat', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Roboto', label: 'Roboto', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Open Sans', label: 'Open Sans', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Lato', label: 'Lato', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Nunito', label: 'Nunito', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Raleway', label: 'Raleway', group: 'Sans-serif', weights: [400, 700] },
  { name: 'Playfair Display', label: 'Playfair Display', group: 'Serif', weights: [400, 700] },
  { name: 'Oswald', label: 'Oswald', group: 'Display', weights: [400, 700] },
  { name: 'Bebas Neue', label: 'Bebas Neue', group: 'Display', weights: [400] },
  { name: 'Dancing Script', label: 'Dancing Script', group: 'Cursive', weights: [400, 700] },
  { name: 'Great Vibes', label: 'Great Vibes', group: 'Cursive', weights: [400] },
  { name: 'Pacifico', label: 'Pacifico', group: 'Cursive', weights: [400] },
  { name: 'Satisfy', label: 'Satisfy', group: 'Cursive', weights: [400] },
  { name: 'Caveat', label: 'Caveat', group: 'Cursive', weights: [400, 700] },
  { name: 'Lobster', label: 'Lobster', group: 'Cursive', weights: [400] },
  { name: 'Allura', label: 'Allura', group: 'Cursive', weights: [400] },
  { name: 'Noto Sans Devanagari', label: 'Hindi · Noto', group: 'Indian', weights: [400, 700] },
  { name: 'Noto Sans Gujarati', label: 'Gujarati · Noto', group: 'Indian', weights: [400, 700] },
];

const GROUP_ORDER = ['Sans-serif', 'Serif', 'Display', 'Cursive', 'Indian'];

export const EDITOR_FONT_GROUPS = GROUP_ORDER.map((group) => ({
  group,
  fonts: EDITOR_FONTS.filter((font) => font.group === group),
})).filter((entry) => entry.fonts.length > 0);

const FONT_URL = `https://fonts.googleapis.com/css2?${EDITOR_FONTS.map((font) => {
  const family = font.name.replace(/ /g, '+');
  const weights = font.weights?.length ? font.weights : [400];
  if (weights.length === 1 && weights[0] === 400) return `family=${family}`;
  return `family=${family}:wght@${weights.join(';')}`;
}).join('&')}&display=swap`;

const loaded = new Set();

export const normalizeFontName = (font) =>
  String(font || 'Inter')
    .replace(/['"]/g, '')
    .split(',')[0]
    .trim();

export const injectEditorFonts = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FONT_STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = FONT_URL;
  document.head.appendChild(link);
};

export const ensureEditorFontLoaded = async (fontFamily) => {
  injectEditorFonts();
  const name = normalizeFontName(fontFamily);
  if (!name) return name;
  if (loaded.has(name)) return name;

  if (typeof document === 'undefined' || !document.fonts?.load) {
    loaded.add(name);
    return name;
  }

  const quoted = name.includes(' ') ? `"${name}"` : name;
  const meta = EDITOR_FONTS.find((font) => font.name === name);
  const weights = meta?.weights?.length ? meta.weights : [400, 700];

  try {
    await Promise.all(
      weights.map((weight) => document.fonts.load(`${weight} 80px ${quoted}`).catch(() => null))
    );
    await document.fonts.ready;
  } catch (err) {
    console.warn('Font load failed', name, err);
  }

  loaded.add(name);
  return name;
};

export const preloadEditorFonts = async () => {
  injectEditorFonts();
  await Promise.all(EDITOR_FONTS.map((font) => ensureEditorFontLoaded(font.name)));
};

export const fontForLanguage = (lang, currentFont) => {
  const name = normalizeFontName(currentFont);
  if (lang === 'hi') return 'Noto Sans Devanagari';
  if (lang === 'gu') return 'Noto Sans Gujarati';
  if (name === 'Noto Sans Devanagari' || name === 'Noto Sans Gujarati') return 'Inter';
  return name || 'Inter';
};
