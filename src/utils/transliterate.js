const DEV_START = 0x0900;
const GUJ_START = 0x0a80;
const BLOCK = 0x80;

const VOWELS = [
  { key: 'aa', indep: 'आ', matra: 'ा' },
  { key: 'ai', indep: 'ऐ', matra: 'ै' },
  { key: 'au', indep: 'औ', matra: 'ौ' },
  { key: 'ee', indep: 'ई', matra: 'ी' },
  { key: 'oo', indep: 'ऊ', matra: 'ू' },
  { key: 'ri', indep: 'ऋ', matra: 'ृ' },
  { key: 'a', indep: 'अ', matra: '' },
  { key: 'A', indep: 'आ', matra: 'ा' },
  { key: 'i', indep: 'इ', matra: 'ि' },
  { key: 'I', indep: 'ई', matra: 'ी' },
  { key: 'u', indep: 'उ', matra: 'ु' },
  { key: 'U', indep: 'ऊ', matra: 'ू' },
  { key: 'e', indep: 'ए', matra: 'े' },
  { key: 'o', indep: 'ओ', matra: 'ो' },
];

const CONSONANTS = [
  ['ksh', 'क्ष'],
  ['gy', 'ज्ञ'],
  ['chh', 'छ'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['ng', 'ङ'],
  ['k', 'क'],
  ['g', 'ग'],
  ['c', 'च'],
  ['j', 'ज'],
  ['t', 'त'],
  ['d', 'द'],
  ['n', 'न'],
  ['p', 'प'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
  ['x', 'क्ष'],
  ['q', 'क'],
  ['f', 'फ'],
  ['z', 'ज़'],
];

const NAME_HINTS = {
  karan: { hi: 'कारन', gu: 'કરણ' },
  vivekananda: { hi: 'विवेकानंद', gu: 'વિવેકાનંદ' },
  swami: { hi: 'स्वामी', gu: 'સ્વામી' },
  jayanti: { hi: 'जयंती', gu: 'જયંતી' },
  modi: { hi: 'मोदी', gu: 'મોદી' },
  narendra: { hi: 'नरेंद्र', gu: 'નરેન્દ્ર' },
  rahul: { hi: 'राहुल', gu: 'રાહુલ' },
  bharat: { hi: 'भारत', gu: 'ભારત' },
  india: { hi: 'इंडिया', gu: 'ઈન્ડિયા' },
  testing: { hi: 'टेस्टिंग', gu: 'ટેસ્ટિંગ' },
};

export const TEXT_LANGUAGES = [
  { id: 'en', label: 'EN', title: 'English' },
  { id: 'hi', label: 'हिं', title: 'Hindi' },
  { id: 'gu', label: 'ગુ', title: 'Gujarati' },
];

export const isLatin = (text) => /[A-Za-z]/.test(text || '');
export const isDevanagari = (text) => /[\u0900-\u097F]/.test(text || '');
export const isGujarati = (text) => /[\u0A80-\u0AFF]/.test(text || '');

export const detectTextLanguage = (text) => {
  if (isDevanagari(text)) return 'hi';
  if (isGujarati(text)) return 'gu';
  return 'en';
};

const mapIndicBlock = (text, fromStart, toStart) =>
  Array.from(text || '')
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code >= fromStart && code < fromStart + BLOCK) {
        return String.fromCodePoint(toStart + (code - fromStart));
      }
      return ch;
    })
    .join('');

export const devanagariToGujarati = (text) => mapIndicBlock(text, DEV_START, GUJ_START);
export const gujaratiToDevanagari = (text) => mapIndicBlock(text, GUJ_START, DEV_START);

const matchAt = (input, index, table) => {
  const slice = input.slice(index);
  for (const item of table) {
    const key = Array.isArray(item) ? item[0] : item.key;
    if (slice.toLowerCase().startsWith(key.toLowerCase())) {
      return { key, len: key.length, item };
    }
  }
  return null;
};

export const latinToDevanagari = (input) => {
  if (!input) return '';
  let i = 0;
  let out = '';
  let pending = null;
  const lower = input;

  const flush = (matra = '') => {
    if (!pending) return;
    out += pending + matra;
    pending = null;
  };

  while (i < lower.length) {
    const ch = lower[i];
    if (!/[A-Za-z]/.test(ch)) {
      flush();
      out += ch;
      i += 1;
      continue;
    }

    const cons = matchAt(lower, i, CONSONANTS);
    const vowel = matchAt(lower, i, VOWELS);
    const takeCons = cons && (!vowel || cons.len >= vowel.len);

    if (takeCons) {
      if (pending) out += `${pending}्`;
      pending = cons.item[1];
      i += cons.len;
      continue;
    }

    if (vowel) {
      if (pending) flush(vowel.item.matra);
      else out += vowel.item.indep;
      i += vowel.len;
      continue;
    }

    flush();
    out += ch;
    i += 1;
  }

  flush();
  return out;
};

const latinToTarget = (latin, lang) => {
  const hinted = latin
    .split(/(\s+)/)
    .map((part) => {
      if (!/[A-Za-z]/.test(part)) return part;
      const mapped = NAME_HINTS[part.toLowerCase()];
      if (mapped?.[lang]) return mapped[lang];
      const hindi = latinToDevanagari(part);
      return lang === 'gu' ? devanagariToGujarati(hindi) : hindi;
    })
    .join('');
  return hinted;
};

const fetchJson = async (url, timeoutMs = 4000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const transliterateWithGoogle = async (text, lang) => {
  const itc = lang === 'gu' ? 'gu-t-i0-und' : 'hi-t-i0-und';
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=${itc}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
  const data = await fetchJson(url);
  if (data?.[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
    return data[1][0][1][0];
  }
  return null;
};

const transliterateWithAi4Bharat = async (text, lang) => {
  const url = `https://xlit-api.ai4bharat.org/tl/${lang}/${encodeURIComponent(text)}`;
  const data = await fetchJson(url);
  if (Array.isArray(data?.result) && data.result[0]) return data.result[0];
  if (Array.isArray(data?.output?.[0]?.target) && data.output[0].target[0]) {
    return data.output[0].target[0];
  }
  return null;
};

const transliterateChunk = async (chunk, lang) => {
  if (!chunk.trim() || !/[A-Za-z]/.test(chunk)) return chunk;
  const hinted = NAME_HINTS[chunk.toLowerCase()]?.[lang];
  if (hinted) return hinted;
  try {
    const google = await transliterateWithGoogle(chunk, lang);
    if (google) return google;
  } catch {
    /* try next source */
  }
  try {
    const ai4b = await transliterateWithAi4Bharat(chunk, lang);
    if (ai4b) return ai4b;
  } catch {
    /* local fallback */
  }
  return latinToTarget(chunk, lang);
};

export const transliterateLatin = async (text, lang) => {
  if (!text) return text;
  if (lang !== 'hi' && lang !== 'gu') return text;

  const parts = text.split(/(\s+)/);
  const converted = [];
  for (const part of parts) {
    converted.push(await transliterateChunk(part, lang));
  }
  return converted.join('');
};

export const convertTextLanguage = async (text, targetLang, latinSource = '') => {
  const source = text || '';
  const fromLatin = isLatin(source) ? source : (isLatin(latinSource) ? latinSource : '');

  if (targetLang === 'en') {
    return fromLatin || source;
  }

  if (fromLatin) {
    return transliterateLatin(fromLatin, targetLang);
  }

  if (targetLang === 'hi') {
    if (isGujarati(source)) return gujaratiToDevanagari(source);
    return source;
  }

  if (targetLang === 'gu') {
    if (isDevanagari(source)) return devanagariToGujarati(source);
    return source;
  }

  return source;
};
