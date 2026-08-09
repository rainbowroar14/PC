/** Block pixel fallback — used when Big Font is "Block" */
const BLOCK_GLYPHS = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10001", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00000", "00100"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  ":": ["00000", "00100", "00000", "00000", "00100", "00000", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
};

const FONT_GROUPS = [
  {
    label: "Mono",
    options: [
      ["dm-mono", "DM Mono"],
      ["space-mono", "Space Mono"],
      ["ibm-plex-mono", "IBM Plex Mono"],
      ["jetbrains-mono", "JetBrains Mono"],
      ["fira-code", "Fira Code"],
      ["courier-prime", "Courier Prime"],
      ["share-tech-mono", "Share Tech Mono"],
      ["courier-new", "Courier New"],
      ["consolas", "Consolas"],
    ],
  },
  {
    label: "Arcade / Pixel",
    options: [
      ["press-start", "Press Start 2P"],
      ["silkscreen", "Silkscreen"],
      ["vt323", "VT323"],
      ["pixelify", "Pixelify Sans"],
      ["orbitron", "Orbitron"],
      ["audiowide", "Audiowide"],
      ["bungee", "Bungee"],
      ["monoton", "Monoton"],
    ],
  },
  {
    label: "Classic",
    options: [
      ["comic-sans", "Comic Sans"],
      ["impact", "Impact"],
      ["arial-black", "Arial Black"],
      ["arial", "Arial"],
      ["times", "Times New Roman"],
      ["georgia", "Georgia"],
      ["verdana", "Verdana"],
      ["trebuchet", "Trebuchet MS"],
      ["papyrus", "Papyrus"],
      ["brush-script", "Brush Script"],
    ],
  },
];

const FONTS = {
  block: { family: '"Press Start 2P", monospace', inkSize: 10 },
  "dm-mono": { family: '"DM Mono", ui-monospace, monospace', inkSize: 12 },
  "space-mono": { family: '"Space Mono", ui-monospace, monospace', inkSize: 12 },
  "ibm-plex-mono": { family: '"IBM Plex Mono", ui-monospace, monospace', inkSize: 12 },
  "jetbrains-mono": { family: '"JetBrains Mono", ui-monospace, monospace', inkSize: 12 },
  "fira-code": { family: '"Fira Code", ui-monospace, monospace', inkSize: 12 },
  "courier-prime": { family: '"Courier Prime", Courier, monospace', inkSize: 12 },
  "share-tech-mono": { family: '"Share Tech Mono", ui-monospace, monospace', inkSize: 13 },
  "courier-new": { family: '"Courier New", Courier, monospace', inkSize: 12 },
  consolas: { family: "Consolas, ui-monospace, monospace", inkSize: 12 },
  "press-start": { family: '"Press Start 2P", monospace', inkSize: 10 },
  silkscreen: { family: "Silkscreen, monospace", inkSize: 12 },
  vt323: { family: "VT323, monospace", inkSize: 16 },
  pixelify: { family: '"Pixelify Sans", sans-serif', inkSize: 14 },
  orbitron: { family: "Orbitron, sans-serif", inkSize: 11 },
  audiowide: { family: "Audiowide, sans-serif", inkSize: 12 },
  bungee: { family: "Bungee, sans-serif", inkSize: 12 },
  monoton: { family: "Monoton, sans-serif", inkSize: 14 },
  "comic-sans": { family: '"Comic Sans MS", "Comic Sans", cursive', inkSize: 13 },
  impact: { family: "Impact, Haettenschweiler, sans-serif", inkSize: 13 },
  "arial-black": { family: '"Arial Black", Arial, sans-serif', inkSize: 12 },
  arial: { family: "Arial, Helvetica, sans-serif", inkSize: 12 },
  times: { family: '"Times New Roman", Times, serif', inkSize: 13 },
  georgia: { family: "Georgia, serif", inkSize: 12 },
  verdana: { family: "Verdana, Geneva, sans-serif", inkSize: 11 },
  trebuchet: { family: '"Trebuchet MS", sans-serif', inkSize: 12 },
  papyrus: { family: "Papyrus, fantasy", inkSize: 13 },
  "brush-script": { family: '"Brush Script MT", cursive', inkSize: 15 },
};

const FONT_LABELS = {
  block: "Block (pixel)",
  "dm-mono": "DM Mono",
  "space-mono": "Space Mono",
  "ibm-plex-mono": "IBM Plex Mono",
  "jetbrains-mono": "JetBrains Mono",
  "fira-code": "Fira Code",
  "courier-prime": "Courier Prime",
  "share-tech-mono": "Share Tech Mono",
  "courier-new": "Courier New",
  consolas: "Consolas",
  "press-start": "Press Start 2P",
  silkscreen: "Silkscreen",
  vt323: "VT323",
  pixelify: "Pixelify Sans",
  orbitron: "Orbitron",
  audiowide: "Audiowide",
  bungee: "Bungee",
  monoton: "Monoton",
  "comic-sans": "Comic Sans",
  impact: "Impact",
  "arial-black": "Arial Black",
  arial: "Arial",
  times: "Times New Roman",
  georgia: "Georgia",
  verdana: "Verdana",
  trebuchet: "Trebuchet MS",
  papyrus: "Papyrus",
  "brush-script": "Brush Script",
};

const DICTIONARY = [
  "archive", "babel", "cinder", "drift", "ember", "fable", "glyph", "harbor",
  "inkwell", "jasper", "kernel", "lantern", "mirage", "nebula", "orchid", "prism",
  "quiver", "ripple", "saturn", "thicket", "umbra", "velvet", "willow", "xenon",
  "yellow", "zephyr", "anchor", "bramble", "canvas", "dawn", "echo", "forest",
  "garden", "horizon", "island", "jungle", "kettle", "lotus", "meadow", "north",
  "ocean", "puzzle", "quartz", "river", "silver", "temple", "ursa", "violet",
  "whisper", "xylophone", "yarn", "zenith", "biscuit", "comet", "delta", "engine",
  "feather", "glacier", "honey", "ivory", "jigsaw", "knight", "lemon", "marble",
  "nectar", "opal", "pebble", "quill", "rocket", "shadow", "tulip", "ursa",
  "voyage", "walnut", "xerox", "yonder", "zeppelin", "apricot", "boulder", "crystal",
];

const textInput = document.getElementById("textInput");
const sizeInput = document.getElementById("sizeInput");
const sizeValue = document.getElementById("sizeValue");
const inkInput = document.getElementById("inkInput");
const flipInput = document.getElementById("flipInput");
const messInput = document.getElementById("messInput");
const messValue = document.getElementById("messValue");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

const sampleCanvas = document.createElement("canvas");
const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
const maskCache = new Map();
const BG_COLOR = "#f7f5f0";
const openPickers = new Set();

let rafId = 0;
let fontInput = { value: "dm-mono" };
let bigFontInput = { value: "impact" };

const boldInput = document.getElementById("boldInput");
const bigBoldInput = document.getElementById("bigBoldInput");
const italicInput = document.getElementById("italicInput");
const bigItalicInput = document.getElementById("bigItalicInput");
const colorInput = document.getElementById("colorInput");
const rainbowInput = document.getElementById("rainbowInput");
const rainbow2Input = document.getElementById("rainbow2Input");
const rainbow3Input = document.getElementById("rainbow3Input");
const colorControls = document.querySelector(".color-controls");
const rainbowInputs = [rainbowInput, rainbow2Input, rainbow3Input];

function buildFontCss(sizePx, family, { bold = false, italic = false } = {}) {
  const style = italic ? "italic" : "normal";
  const weight = bold ? "700" : "400";
  return `${style} ${weight} ${sizePx}px ${family}`;
}

function rainbowColorAt(t) {
  const hue = ((((t % 1) + 1) % 1) * 360);
  return `hsl(${hue} 85% 42%)`;
}

function getRainbowMode() {
  if (rainbow3Input.checked) return 3;
  if (rainbow2Input.checked) return 2;
  if (rainbowInput.checked) return 1;
  return 0;
}

function setRainbowMode(mode) {
  rainbowInput.checked = mode === 1;
  rainbow2Input.checked = mode === 2;
  rainbow3Input.checked = mode === 3;
}

function letterRainbowGradient(ctx, x0, x1, phase = 0) {
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  const stops = [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1];
  for (const stop of stops) {
    grad.addColorStop(stop, rainbowColorAt(stop + phase));
  }
  return grad;
}

function randomDictionaryWord(exclude) {
  let word = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
  if (DICTIONARY.length > 1) {
    while (word === exclude) {
      word = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
    }
  }
  return word;
}

function fontFamilyFor(id) {
  return (FONTS[id] || FONTS["dm-mono"]).family;
}

function createFontPicker(mount, { includeBlock = false, selected = "dm-mono", onChange } = {}) {
  const root = document.createElement("div");
  root.className = "font-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "font-picker-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "font-picker-trigger-label";

  const caret = document.createElement("span");
  caret.className = "font-picker-caret";
  caret.textContent = "▾";
  caret.setAttribute("aria-hidden", "true");

  trigger.append(triggerLabel, caret);

  const menu = document.createElement("div");
  menu.className = "font-picker-menu";
  menu.setAttribute("role", "listbox");

  const list = document.createElement("div");
  list.className = "font-picker-list";

  const preview = document.createElement("aside");
  preview.className = "font-picker-preview";
  preview.innerHTML = `
    <p class="font-preview-hint">Preview</p>
    <p class="font-preview-name"></p>
    <div class="font-preview-styles">
      <div class="font-preview-row">
        <span class="font-preview-style-label">Normal:</span>
        <span class="font-preview-sample is-normal"></span>
      </div>
      <div class="font-preview-row">
        <span class="font-preview-style-label">Bold:</span>
        <span class="font-preview-sample is-bold"></span>
      </div>
      <div class="font-preview-row">
        <span class="font-preview-style-label">Underline:</span>
        <span class="font-preview-sample is-underline"></span>
      </div>
      <div class="font-preview-row">
        <span class="font-preview-style-label">Italic:</span>
        <span class="font-preview-sample is-italic"></span>
      </div>
      <div class="font-preview-row">
        <span class="font-preview-style-label">Ultrabold:</span>
        <span class="font-preview-sample is-ultrabold"></span>
      </div>
      <div class="font-preview-row">
        <span class="font-preview-style-label">Bold Italic:</span>
        <span class="font-preview-sample is-bold-italic"></span>
      </div>
    </div>
    <div class="font-preview-toggles">
      <label class="font-preview-toggle">
        <input type="checkbox" class="font-preview-spin" />
        <span>Spin</span>
      </label>
      <label class="font-preview-toggle">
        <input type="checkbox" class="font-preview-rainbow" />
        <span>Rainbow</span>
      </label>
    </div>
  `;

  const previewName = preview.querySelector(".font-preview-name");
  const previewSamples = preview.querySelectorAll(".font-preview-sample");
  const previewStyles = preview.querySelector(".font-preview-styles");
  const spinToggle = preview.querySelector(".font-preview-spin");
  const rainbowToggle = preview.querySelector(".font-preview-rainbow");

  menu.append(list, preview);
  root.append(trigger, menu);
  mount.replaceChildren(root);

  const groups = [];
  if (includeBlock) {
    groups.push({ label: "Shape", options: [["block", FONT_LABELS.block]] });
  }
  groups.push(...FONT_GROUPS);

  let value = selected;
  let hoveredId = selected;
  let wordTimer = 0;
  let currentWord = "";

  function setTrigger() {
    const label = FONT_LABELS[value] || value;
    triggerLabel.textContent = label;
    triggerLabel.style.fontFamily = fontFamilyFor(value);
  }

  function syncSelectedStyles() {
    list.querySelectorAll(".font-option").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.value === value);
    });
  }

  function showPreview(fontId) {
    hoveredId = fontId;
    const label = FONT_LABELS[fontId] || fontId;
    const family = fontFamilyFor(fontId);
    previewName.textContent = label;
    previewName.style.fontFamily = family;
    previewSamples.forEach((sample) => {
      sample.style.fontFamily = family;
    });
    list.querySelectorAll(".font-option").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.value === fontId);
    });
    if (root.classList.contains("is-open")) startWordCycle();
    else swapPreviewWord(true);
  }

  function applyPreviewWord(word) {
    previewSamples.forEach((sample) => {
      sample.textContent = word;
    });
  }

  function swapPreviewWord(immediate = false) {
    const next = randomDictionaryWord(currentWord);
    currentWord = next;
    if (immediate) {
      previewStyles.classList.remove("is-swap");
      applyPreviewWord(next);
      return;
    }
    previewStyles.classList.add("is-swap");
    window.setTimeout(() => {
      applyPreviewWord(next);
      previewStyles.classList.remove("is-swap");
    }, 160);
  }

  function startWordCycle() {
    stopWordCycle();
    swapPreviewWord(true);
    wordTimer = window.setInterval(() => swapPreviewWord(false), 3000);
  }

  function stopWordCycle() {
    if (wordTimer) {
      window.clearInterval(wordTimer);
      wordTimer = 0;
    }
  }

  function placeMenu() {
    menu.classList.remove("is-left");
    const rect = trigger.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    if (spaceRight < 280) {
      menu.classList.add("is-left");
    }
  }

  function openMenu() {
    openPickers.forEach((other) => {
      if (other !== api) other.close();
    });
    openPickers.add(api);
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    placeMenu();
    showPreview(value);
  }

  function closeMenu() {
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    stopWordCycle();
    openPickers.delete(api);
  }

  function setValue(next, emit = true) {
    value = next;
    setTrigger();
    syncSelectedStyles();
    if (emit && typeof onChange === "function") onChange(value);
  }

  for (const group of groups) {
    const groupLabel = document.createElement("p");
    groupLabel.className = "font-picker-group-label";
    groupLabel.textContent = group.label;
    list.appendChild(groupLabel);

    for (const [id, label] of group.options) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "font-option";
      option.dataset.value = id;
      option.setAttribute("role", "option");
      option.innerHTML = `
        <span class="font-option-sample"></span>
        <span class="font-option-meta"></span>
      `;
      const sample = option.querySelector(".font-option-sample");
      const meta = option.querySelector(".font-option-meta");
      sample.textContent = label;
      sample.style.fontFamily = fontFamilyFor(id);
      meta.textContent = label;
      option.addEventListener("mouseenter", () => showPreview(id));
      option.addEventListener("focus", () => showPreview(id));
      option.addEventListener("click", () => {
        setValue(id, true);
        closeMenu();
      });
      list.appendChild(option);
    }
  }

  spinToggle.addEventListener("change", () => {
    previewStyles.classList.toggle("is-spinning", spinToggle.checked);
  });

  rainbowToggle.addEventListener("change", () => {
    previewStyles.classList.toggle("is-rainbow", rainbowToggle.checked);
  });

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    if (root.classList.contains("is-open")) closeMenu();
    else openMenu();
  });

  const api = {
    get value() {
      return value;
    },
    set value(next) {
      setValue(next, false);
    },
    close: closeMenu,
    root,
  };

  setValue(selected, false);
  return api;
}

function nextInk(ink, index) {
  return ink[index % ink.length];
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scaleBlockGlyph(char, size) {
  const key = char.toUpperCase();
  const glyph = BLOCK_GLYPHS[key] || BLOCK_GLYPHS["?"];
  const rows = [];
  for (const row of glyph) {
    for (let r = 0; r < size; r++) {
      let line = "";
      for (const bit of row) line += bit.repeat(size);
      rows.push(line);
    }
  }
  return rows;
}

function sampleTextMask(text, family, height, { bold = false, italic = false } = {}) {
  const cacheKey = `${text}||${family}||${height}||${bold}||${italic}`;
  if (maskCache.has(cacheKey)) return maskCache.get(cacheKey);

  const fontSize = Math.max(8, Math.floor(height * 0.9));
  const fontCss = buildFontCss(fontSize, family, { bold, italic });
  sampleCtx.font = fontCss;
  const metrics = sampleCtx.measureText(text || " ");
  const italicPad = italic ? Math.ceil(fontSize * 0.25) : 0;
  const width = Math.max(1, Math.ceil(metrics.width) + 4 + italicPad);

  sampleCanvas.width = width;
  sampleCanvas.height = height;
  sampleCtx.clearRect(0, 0, width, height);
  sampleCtx.font = fontCss;
  sampleCtx.textAlign = "left";
  sampleCtx.textBaseline = "middle";
  sampleCtx.fillStyle = "#000";
  sampleCtx.fillText(text || " ", 2 + italicPad, height / 2);

  const { data } = sampleCtx.getImageData(0, 0, width, height);
  const rows = new Array(height);

  for (let y = 0; y < height; y++) {
    let row = "";
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      row += data[rowOffset + x * 4 + 3] > 100 ? "1" : "0";
    }
    rows[y] = row;
  }

  maskCache.set(cacheKey, rows);
  if (maskCache.size > 120) {
    const first = maskCache.keys().next().value;
    maskCache.delete(first);
  }

  return rows;
}

function maskToGrid(mask, inkSource, message, flip, letterSpans = null) {
  const ink = (inkSource && inkSource.length ? inkSource : message).replace(/\s/g, "") || "X";
  const height = mask.length;
  const width = mask[0]?.length || 1;
  const grid = Array.from({ length: height }, () => Array(width).fill(" "));
  const letterOf = Array.from({ length: height }, () => Array(width).fill(-1));
  let inkIndex = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = mask[y][x] === "1";
      if (flip ? !on : on) {
        grid[y][x] = nextInk(ink, inkIndex++);
        if (letterSpans) {
          const span = letterSpans.find((s) => x >= s.start && x < s.end);
          letterOf[y][x] = span ? span.index : 0;
        } else {
          letterOf[y][x] = 0;
        }
      }
    }
  }

  return { grid, letterOf, letterCount: letterSpans ? letterSpans.length : 1 };
}

function composeGrid(text, size, inkSource, flip, bigFontId, bigStyle = {}) {
  const message = text.length ? text : " ";
  const height = 7 * size;
  let mask;
  let letterSpans = null;

  if (bigFontId === "block") {
    const built = composeBlockMaskWithSpans(message, size);
    mask = built.rows;
    letterSpans = built.spans;
  } else {
    const family = (FONTS[bigFontId] || FONTS.impact).family;
    const built = sampleTextMaskWithSpans(message, family, height, bigStyle);
    mask = built.rows;
    letterSpans = built.spans;
  }

  return maskToGrid(mask, inkSource, message, flip, letterSpans);
}

function composeBlockMaskWithSpans(text, size) {
  const letters = [...(text.length ? text : " ")];
  const height = 7 * size;
  const gap = size;
  const masks = letters.map((ch) => scaleBlockGlyph(ch, size));
  const width =
    masks.reduce((sum, mask) => sum + mask[0].length, 0) +
    Math.max(0, letters.length - 1) * gap;

  const rows = Array.from({ length: height }, () => "0".repeat(width));
  const spans = [];
  let xOffset = 0;

  masks.forEach((mask, i) => {
    const start = xOffset;
    const end = xOffset + mask[0].length;
    spans.push({ index: i, start, end });
    for (let y = 0; y < height; y++) {
      const row = rows[y].split("");
      for (let x = 0; x < mask[y].length; x++) row[xOffset + x] = mask[y][x];
      rows[y] = row.join("");
    }
    xOffset += mask[0].length + (i < masks.length - 1 ? gap : 0);
  });

  return { rows, spans };
}

function sampleTextMaskWithSpans(text, family, height, style = {}) {
  const rows = sampleTextMask(text, family, height, style);
  const width = rows[0]?.length || 1;
  const letters = [...(text.length ? text : " ")];
  const spans = [];

  // Estimate per-letter columns from measured widths
  const fontSize = Math.max(8, Math.floor(height * 0.9));
  const fontCss = buildFontCss(fontSize, family, style);
  sampleCtx.font = fontCss;
  const total = Math.max(1, sampleCtx.measureText(text || " ").width);
  let x = 0;
  letters.forEach((ch, i) => {
    const w = sampleCtx.measureText(ch).width;
    const start = Math.floor((x / total) * width);
    x += w;
    const end = i === letters.length - 1 ? width : Math.floor((x / total) * width);
    spans.push({ index: i, start, end: Math.max(end, start + 1) });
  });

  return { rows, spans };
}

function drawGrid(grid, fontId, messiness, seedKey, inkStyle = {}) {
  const font = FONTS[fontId] || FONTS["dm-mono"];
  const fontSize = font.inkSize;
  const rand = mulberry32(hashSeed(seedKey));
  const maxJitter = (messiness / 100) * fontSize * 0.55;
  const bold = !!inkStyle.bold;
  const italic = !!inkStyle.italic;
  const rainbowMode = inkStyle.rainbowMode || 0;
  const solidColor = inkStyle.color || "#2a211c";
  const phase = inkStyle.phase || 0;
  const fontCss = buildFontCss(fontSize, font.family, { bold, italic });

  ctx.font = fontCss;
  const cellW = Math.max(6, Math.ceil(ctx.measureText("M").width));
  const cellH = Math.ceil(fontSize * 1.15);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const pad = 16;
  const width = Math.max(1, cols * cellW + pad * 2);
  const height = Math.max(1, rows * cellH + pad * 2);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.font = fontCss;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      if (ch === " ") continue;

      let cx = pad + x * cellW + cellW / 2;
      let cy = pad + y * cellH + cellH / 2;
      let dx = 0;
      let dy = 0;
      let rot = 0;

      if (maxJitter > 0) {
        dx = (rand() * 2 - 1) * maxJitter;
        dy = (rand() * 2 - 1) * maxJitter;
        rot = ((rand() * 2 - 1) * messiness * Math.PI) / 180;
      }

      const paint = () => {
        if (rainbowMode === 1) {
          ctx.fillStyle = rainbowColorAt(cols <= 1 ? 0 : x / (cols - 1));
        } else if (rainbowMode === 2) {
          ctx.fillStyle = letterRainbowGradient(ctx, -cellW * 0.55, cellW * 0.55, phase);
        } else if (rainbowMode === 3) {
          // Smooth synced fade across the whole piece, right → left
          const t = cols <= 1 ? 0 : 1 - x / (cols - 1);
          ctx.fillStyle = rainbowColorAt(t - phase);
        } else {
          ctx.fillStyle = solidColor;
        }
        ctx.fillText(ch, 0, 0);
      };

      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      if (rot) ctx.rotate(rot);
      paint();
      ctx.restore();
    }
  }
}

function syncColorControls() {
  const mode = getRainbowMode();
  colorInput.disabled = mode > 0;
  colorControls.classList.toggle("is-rainbow", mode > 0);
}

let rainbowAnimId = 0;

function stopRainbowAnim() {
  if (rainbowAnimId) {
    cancelAnimationFrame(rainbowAnimId);
    rainbowAnimId = 0;
  }
}

function startRainbowAnim() {
  stopRainbowAnim();
  const tick = () => {
    const mode = getRainbowMode();
    if (mode !== 2 && mode !== 3) {
      rainbowAnimId = 0;
      return;
    }
    renderNow();
    rainbowAnimId = requestAnimationFrame(tick);
  };
  rainbowAnimId = requestAnimationFrame(tick);
}

function renderNow() {
  const text = textInput.value;
  const size = Number(sizeInput.value);
  const ink = inkInput.value;
  const flip = flipInput.checked;
  const messiness = Number(messInput.value);
  const fontId = fontInput.value;
  const bigFontId = bigFontInput.value;
  const bold = boldInput.checked;
  const bigBold = bigBoldInput.checked;
  const italic = italicInput.checked;
  const bigItalic = bigItalicInput.checked;
  const rainbowMode = getRainbowMode();
  const color = colorInput.value;
  const phase =
    rainbowMode === 2 || rainbowMode === 3 ? (performance.now() / 2800) % 1 : 0;

  sizeValue.textContent = String(size);
  messValue.textContent = String(messiness);
  syncColorControls();

  const { grid } = composeGrid(text, size, ink, flip, bigFontId, {
    bold: bigBold,
    italic: bigItalic,
  });
  const seedKey = `${text}|${size}|${ink}|${flip}|${bigFontId}|${bigBold}|${bigItalic}`;
  drawGrid(grid, fontId, messiness, seedKey, {
    bold,
    italic,
    rainbowMode,
    color,
    phase,
  });
}

function scheduleUpdate() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    renderNow();
    const mode = getRainbowMode();
    if (mode === 2 || mode === 3) startRainbowAnim();
    else stopRainbowAnim();
  });
}

fontInput = createFontPicker(document.getElementById("fontPickerMount"), {
  selected: "dm-mono",
  onChange: () => {
    termPatch("fonts.ink", fontInput.value, "link face");
    scheduleUpdate();
  },
});

bigFontInput = createFontPicker(document.getElementById("bigFontPickerMount"), {
  includeBlock: true,
  selected: "impact",
  onChange: () => {
    termPatch("fonts.big", bigFontInput.value, "shape face");
    scheduleUpdate();
  },
});

function termLog(lines) {
  if (typeof window.archiveTermLog === "function") {
    window.archiveTermLog("text-generator", lines);
  }
}

function termPatch(key, value, extra) {
  const v = typeof value === "string" ? `"${String(value).replace(/"/g, '\\"')}"` : String(value);
  termLog([
    `> patch ${key} = ${v}`,
    `  compiling glyph matrix...`,
    `  ok  // ${extra || "settings hot-reload"}`,
  ]);
}

document.addEventListener("pointerdown", (event) => {
  openPickers.forEach((picker) => {
    if (!picker.root.contains(event.target)) picker.close();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    openPickers.forEach((picker) => picker.close());
  }
});

textInput.addEventListener("input", scheduleUpdate);
sizeInput.addEventListener("input", scheduleUpdate);
inkInput.addEventListener("input", scheduleUpdate);
flipInput.addEventListener("change", scheduleUpdate);
messInput.addEventListener("input", scheduleUpdate);
boldInput.addEventListener("change", scheduleUpdate);
bigBoldInput.addEventListener("change", scheduleUpdate);
italicInput.addEventListener("change", scheduleUpdate);
bigItalicInput.addEventListener("change", scheduleUpdate);
colorInput.addEventListener("input", scheduleUpdate);
rainbowInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) {
      const mode = Number(input.dataset.rainbow);
      setRainbowMode(mode);
      termPatch("display.rainbow", mode, "shader bind");
    }
    scheduleUpdate();
  });
});

let textLogTimer = 0;
textInput.addEventListener("input", () => {
  window.clearTimeout(textLogTimer);
  textLogTimer = window.setTimeout(() => {
    termPatch("display.text", textInput.value, "buffer rewrite");
  }, 280);
});
sizeInput.addEventListener("input", () => {
  termPatch("display.size", sizeInput.value, "scale raster");
});
inkInput.addEventListener("input", () => {
  window.clearTimeout(textLogTimer);
  textLogTimer = window.setTimeout(() => {
    termPatch("display.inkletters", inkInput.value || "(from text)", "ink stream");
  }, 280);
});
flipInput.addEventListener("change", () => {
  termPatch("display.flip", flipInput.checked ? 1 : 0, "mask invert");
});
messInput.addEventListener("input", () => {
  termPatch("display.messiness", messInput.value, "jitter seed");
});
boldInput.addEventListener("change", () => {
  termPatch("style.bold", boldInput.checked ? 1 : 0);
});
bigBoldInput.addEventListener("change", () => {
  termPatch("style.bigBold", bigBoldInput.checked ? 1 : 0);
});
italicInput.addEventListener("change", () => {
  termPatch("style.italic", italicInput.checked ? 1 : 0);
});
bigItalicInput.addEventListener("change", () => {
  termPatch("style.bigItalic", bigItalicInput.checked ? 1 : 0);
});
colorInput.addEventListener("input", () => {
  termPatch("display.color", colorInput.value, "palette write");
});
function selectTool(toolId) {
  document.querySelectorAll(".tool-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === toolId);
  });
}

window.selectTool = selectTool;

window.setTextGenProfile = function setTextGenProfile(profile) {
  const demo = profile === "demo";
  document.querySelectorAll("[data-feature='size']").forEach((el) => {
    el.hidden = demo;
  });
  document.querySelectorAll("[data-feature='rainbow']").forEach((el) => {
    el.hidden = demo;
  });
  if (demo) {
    setRainbowMode(0);
    sizeInput.value = "3";
    sizeValue.textContent = "3";
  }
  scheduleUpdate();
};

window.parseTextGenIni = function parseTextGenIni(text) {
  const out = {};
  let section = "";
  String(text || "")
    .split(/\r?\n/)
    .forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith(";") || line.startsWith("#")) return;
      const sec = line.match(/^\[(.+)\]$/);
      if (sec) {
        section = sec[1].toLowerCase();
        return;
      }
      const eq = line.indexOf("=");
      if (eq < 0) return;
      const key = line.slice(0, eq).trim().toLowerCase();
      const val = line.slice(eq + 1).trim();
      out[`${section}.${key}`] = val;
      out[key] = val;
    });
  return out;
};

window.applyTextGenConfig = function applyTextGenConfig(iniText) {
  const cfg = window.parseTextGenIni(iniText);
  if (cfg.text != null) textInput.value = cfg.text;
  if (cfg.size != null) {
    sizeInput.value = String(Math.max(1, Math.min(12, Number(cfg.size) || 3)));
    sizeValue.textContent = sizeInput.value;
  }
  if (cfg.messiness != null) {
    messInput.value = String(Math.max(0, Math.min(100, Number(cfg.messiness) || 0)));
    messValue.textContent = messInput.value;
  }
  if (cfg.inkletters != null) inkInput.value = cfg.inkletters;
  if (cfg["display.inkletters"] != null) inkInput.value = cfg["display.inkletters"];
  if (cfg.flip != null) flipInput.checked = cfg.flip === "1" || cfg.flip === "true";
  if (cfg.rainbow != null) setRainbowMode(Math.max(0, Math.min(3, Number(cfg.rainbow) || 0)));
  if (cfg.color != null) {
    const hex = cfg.color.startsWith("#") ? cfg.color : `#${cfg.color}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) colorInput.value = hex;
  }
  const inkFont = cfg["fonts.ink"] || cfg.inkfont;
  const bigFont = cfg["fonts.big"] || cfg.bigfont;
  if (inkFont && FONTS[inkFont]) fontInput.value = inkFont;
  if (bigFont && (FONTS[bigFont] || bigFont === "block")) bigFontInput.value = bigFont;
  scheduleUpdate();
};

window.serializeTextGenConfig = function serializeTextGenConfig() {
  return (
    "[display]\r\n" +
    `text=${textInput.value}\r\n` +
    `size=${sizeInput.value}\r\n` +
    `messiness=${messInput.value}\r\n` +
    `rainbow=${getRainbowMode()}\r\n` +
    `flip=${flipInput.checked ? 1 : 0}\r\n` +
    `inkletters=${inkInput.value}\r\n` +
    `color=${colorInput.value}\r\n` +
    "\r\n[fonts]\r\n" +
    `ink=${fontInput.value}\r\n` +
    `big=${bigFontInput.value}\r\n`
  );
};

document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => selectTool(btn.dataset.tool));
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    maskCache.clear();
    scheduleUpdate();
  });
}

scheduleUpdate();
