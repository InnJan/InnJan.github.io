import { GIFEncoder, quantize, applyPalette } from "./vendor/gifenc.esm.js";

const $ = (selector) => document.querySelector(selector);
const formulas = [...document.querySelectorAll(".formula")];
const fileInput = $("#fileInput");
const dropZone = $("#dropZone");
const processButton = $("#processButton");
const printButton = $("#printButton");
const downloadButton = $("#downloadButton");
const saveNote = $("#saveNote");
const mediaResult = $("#mediaResult");
const officeShell = $("#officeShell");
const officePreview = $("#officePreview");
const officeStyles = $("#officeStyles");
const emptyState = $("#emptyState");
const printHint = $("#printHint");
const mergeQueue = $("#mergeQueue");

const modes = {
  docx: { code: "DOCX · PDF", title: "文稿析页", intro: "导入 .docx，在浏览器中逐页还原并直接生成 PDF 文件，无需经过打印面板。", drop: "放入 Word 文稿", hint: "点击选择，或把文件拖到这里 · 支持 DOCX", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", action: "直接生成并下载 PDF" },
  pptx: { code: "PPTX · PDF", title: "幻灯凝版", intro: "把 .pptx 的每一页还原为静态画面，在设备中直接生成并下载 PDF。", drop: "放入 PowerPoint", hint: "点击选择，或把文件拖到这里 · 支持 PPTX", accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", action: "直接生成并下载 PDF" },
  gif: { code: "VIDEO · GIF", title: "影像回环", intro: "截取视频里最值得反复观看的片段，量化色彩并炼成可分享的循环 GIF。", drop: "放入一段视频", hint: "点击选择，或把文件拖到这里 · 建议 12 秒以内", accept: "video/*,.mp4,.mov,.webm,.m4v", action: "开始生成 GIF" },
  mp3: { code: "VIDEO · MP3", title: "声音蒸馏", intro: "从视频中提取音轨，在本地编码为通用 MP3；适合访谈、讲座、配乐与声音备忘。", drop: "放入含声音的视频", hint: "点击选择，或把文件拖到这里 · 视频或音频均可", accept: "video/*,audio/*,.mp4,.mov,.webm,.m4v,.wav,.m4a", action: "开始提取 MP3" },
  image: { code: "IMAGE · IMAGE", title: "静帧换质", intro: "在 PNG、JPEG 与 WebP 之间转化，选择体积和细节之间恰到好处的平衡。", drop: "放入一张图片", hint: "点击选择，或把文件拖到这里 · PNG / JPEG / WebP", accept: "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp", action: "开始转换图片" },
  merge: { code: "PDF × N · PDF", title: "页序合卷", intro: "一次加入多份 PDF，用上下按钮排成所需顺序，再无损复制页面合成一个文件。", drop: "放入多份 PDF", hint: "可一次多选，也可继续添加 · 至少 2 份", accept: "application/pdf,.pdf", action: "按当前顺序合并 PDF" },
  watermark: { code: "PDF · MARK", title: "纸面铭印", intro: "为 PDF 每一页加入自己编辑的文字水印，可调颜色、透明度、字号、角度和排列。", drop: "放入一份 PDF", hint: "水印在本地写入 · 支持 PDF", accept: "application/pdf,.pdf", action: "添加水印并下载" },
  zip: { code: "FILES · ZIP", title: "万物收匣", intro: "把同时选择的任意文件收进一个 ZIP 压缩包，保留文件名并直接下载。", drop: "放入任意多个文件", hint: "可一次多选，也可继续添加", accept: "*/*", action: "打包并下载 ZIP" },
  unzip: { code: "ZIP · FILES", title: "封匣解构", intro: "在本地安全读取 ZIP，列出其中的文件并逐个保存，不向服务器发送内容。", drop: "放入一个 ZIP 压缩包", hint: "当前支持通用 ZIP 格式", accept: "application/zip,.zip", action: "解开并查看文件" },
  compress: { code: "MEDIA · SIZE", title: "介质减重", intro: "设定希望的体积范围：图片会迭代品质与尺寸，视频会按时长计算码率后本地转码。", drop: "放入图片或视频", hint: "支持常见图片、MP4 / MOV / WebM", accept: "image/*,video/*,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.m4v", action: "压缩至目标范围" }
};

let currentMode = "docx";
let currentFile = null;
let currentFiles = [];
let resultUrl = "";
let transientUrls = [];
let pptViewer = null;
let busy = false;
let officeOutput = "direct";
let ffmpegInstance = null;
const FFMPEG_WASM_CDN = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm";
const isTouchPhone = window.matchMedia("(max-width: 560px), (pointer: coarse)").matches;

function setStatus(text, percent = 0) {
  $("#statusText").textContent = text;
  $("#statusPercent").textContent = `${Math.round(percent)}%`;
  $("#progressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const extension = (file) => (file.name.split(".").pop() || "").toLowerCase();
const baseName = (name) => name.replace(/\.[^.]+$/, "") || "innjan-export";

function validForMode(file, mode = currentMode) {
  const ext = extension(file);
  if (mode === "docx") return ext === "docx";
  if (mode === "pptx") return ext === "pptx";
  if (["merge", "watermark"].includes(mode)) return file.type === "application/pdf" || ext === "pdf";
  if (mode === "zip") return true;
  if (mode === "unzip") return ["zip"].includes(ext) || file.type === "application/zip";
  if (mode === "compress") return /^(image|video)\//.test(file.type) || ["jpg", "jpeg", "png", "webp", "mp4", "mov", "webm", "m4v"].includes(ext);
  if (mode === "gif") return file.type.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(ext);
  if (mode === "mp3") return /^(video|audio)\//.test(file.type) || ["mp4", "mov", "webm", "m4v", "wav", "m4a"].includes(ext);
  return file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
}

function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  transientUrls.forEach((url) => URL.revokeObjectURL(url));
  transientUrls = [];
  resultUrl = "";
  downloadButton.classList.remove("show");
  saveNote.classList.remove("show");
  downloadButton.removeAttribute("href");
  mediaResult.classList.remove("show");
  mediaResult.replaceChildren();
  officeShell.classList.remove("show");
  officePreview.replaceChildren();
  officePreview.classList.remove("pptx-viewer");
  officeStyles.replaceChildren();
  emptyState.hidden = false;
  printHint.classList.remove("show");
  processButton.dataset.readyPrint = "false";
  if (pptViewer?.destroy) pptViewer.destroy();
  pptViewer = null;
}

function switchMode(mode) {
  if (busy || !modes[mode]) return;
  currentMode = mode;
  currentFile = null;
  currentFiles = [];
  fileInput.value = "";
  clearResult();
  formulas.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  const data = modes[mode];
  $("#modeCode").textContent = data.code;
  $("#modeTitle").textContent = data.title;
  $("#modeIntro").textContent = data.intro;
  $("#dropTitle").textContent = data.drop;
  $("#dropHint").textContent = data.hint;
  fileInput.accept = data.accept;
  fileInput.multiple = ["merge", "zip"].includes(mode);
  $("#fileCard").classList.remove("show");
  mergeQueue.replaceChildren();
  $("#gifSettings").hidden = mode !== "gif";
  $("#mp3Settings").hidden = mode !== "mp3";
  $("#imageSettings").hidden = mode !== "image";
  $("#watermarkSettings").hidden = mode !== "watermark";
  $("#zipSettings").hidden = mode !== "zip";
  $("#compressSettings").hidden = mode !== "compress";
  printButton.hidden = true;
  processButton.disabled = true;
  processButton.textContent = "选择文件后开始";
  setStatus("等待材料", 0);
}

function receiveFile(file) {
  if (!file) return;
  if (!validForMode(file)) return setStatus(`这个配方不接受 .${extension(file) || "未知格式"} 文件`, 0);
  const mediaMode = ["gif", "mp3", "compress"].includes(currentMode);
  const limit = mediaMode ? (isTouchPhone ? 220 : 800) : (isTouchPhone ? 120 : 300);
  if (file.size > limit * 1024 * 1024) return setStatus(`文件超过 ${limit} MB，为保护设备内存已停止`, 0);
  currentFile = file;
  clearResult();
  $("#fileName").textContent = file.name;
  $("#fileMeta").textContent = `${formatBytes(file.size)} · ${file.type || extension(file).toUpperCase()}`;
  $("#fileCard").classList.add("show");
  processButton.disabled = false;
  processButton.textContent = modes[currentMode].action;
  printButton.hidden = !["docx", "pptx"].includes(currentMode);
  setStatus("材料已就位", 0);
}

function renderFileQueue() {
  mergeQueue.replaceChildren();
  currentFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "merge-item";
    item.innerHTML = `<span class="merge-index">${index + 1}</span><span class="merge-file"><strong></strong><small>${formatBytes(file.size)}</small></span><button class="queue-action" type="button" data-action="up" aria-label="上移">↑</button><button class="queue-action" type="button" data-action="down" aria-label="下移">↓</button><button class="queue-action remove" type="button" data-action="remove" aria-label="删除">×</button>`;
    item.querySelector("strong").textContent = file.name;
    item.querySelector('[data-action="up"]').disabled = index === 0;
    item.querySelector('[data-action="down"]').disabled = index === currentFiles.length - 1;
    item.querySelectorAll("button").forEach((button) => button.dataset.index = String(index));
    mergeQueue.append(item);
  });
  const enough = currentMode === "merge" ? currentFiles.length >= 2 : currentFiles.length >= 1;
  processButton.disabled = !enough;
  processButton.textContent = enough ? modes[currentMode].action : (currentMode === "merge" ? "至少选择两份 PDF" : "选择文件后开始");
  setStatus(currentFiles.length ? `已排列 ${currentFiles.length} 个文件` : "等待材料", 0);
}

function receiveFiles(files) {
  const list = [...files].filter(Boolean);
  if (!["merge", "zip"].includes(currentMode)) return receiveFile(list[0]);
  const valid = list.filter((file) => validForMode(file));
  if (!valid.length) return setStatus("没有找到这个配方可用的文件", 0);
  const total = [...currentFiles, ...valid].reduce((sum, file) => sum + file.size, 0);
  const limit = (isTouchPhone ? 250 : 1000) * 1024 * 1024;
  if (total > limit) return setStatus(`总文件超过 ${isTouchPhone ? 250 : 1000} MB，为保护设备内存已停止`, 0);
  clearResult();
  currentFiles.push(...valid);
  renderFileQueue();
}

formulas.forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
fileInput.addEventListener("change", () => receiveFiles(fileInput.files));
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("drag"); }));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("drag"); }));
dropZone.addEventListener("drop", (event) => receiveFiles(event.dataTransfer.files));
mergeQueue.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === "remove") currentFiles.splice(index, 1);
  if (button.dataset.action === "up" && index > 0) [currentFiles[index - 1], currentFiles[index]] = [currentFiles[index], currentFiles[index - 1]];
  if (button.dataset.action === "down" && index < currentFiles.length - 1) [currentFiles[index + 1], currentFiles[index]] = [currentFiles[index], currentFiles[index + 1]];
  renderFileQueue();
});

function revealOffice() {
  emptyState.hidden = true;
  mediaResult.classList.remove("show");
  officeShell.classList.add("show");
  printHint.classList.add("show");
  $("#stageLabel").textContent = "Pages / 页面预览";
}

function revealMedia(node) {
  emptyState.hidden = true;
  officeShell.classList.remove("show");
  mediaResult.replaceChildren(node);
  mediaResult.classList.add("show");
  $("#stageLabel").textContent = "Result / 转换结果";
}

function prepareDownload(blob, filename) {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = URL.createObjectURL(blob);
  downloadButton.href = resultUrl;
  downloadButton.download = filename;
  downloadButton.textContent = isTouchPhone ? "一键保存到手机 ↓" : "一键保存文件 ↓";
  saveNote.textContent = "文件会进入手机的“下载”或“文件”目录";
  downloadButton.classList.add("show");
  saveNote.classList.add("show");
  if (isTouchPhone) {
    requestAnimationFrame(() => downloadButton.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

async function createOfficePdf(kind) {
  const html2canvas = window.html2canvas;
  const JsPdf = window.jspdf?.jsPDF;
  if (!html2canvas || !JsPdf) throw new Error("PDF 生成组件未能载入");
  if (document.fonts?.ready) await document.fonts.ready;
  const selector = kind === "docx" ? ".docx-wrapper > section.docx" : "[data-slide-index]";
  let pages = [...officePreview.querySelectorAll(selector)];
  if (!pages.length) pages = [officePreview];
  let pdf = null;
  const quality = isTouchPhone ? .84 : .9;
  const scale = isTouchPhone ? 1.25 : 1.6;
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    setStatus(`正在生成 PDF · 第 ${index + 1} / ${pages.length} 页`, 58 + index / pages.length * 36);
    const canvas = await html2canvas(page, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: false,
      allowTaint: false,
      logging: false,
      imageTimeout: 0,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(document.documentElement.clientWidth, page.scrollWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, page.scrollHeight)
    });
    const width = canvas.width;
    const height = canvas.height;
    const orientation = width > height ? "landscape" : "portrait";
    if (!pdf) {
      pdf = new JsPdf({ orientation, unit: "px", format: [width, height], compress: true, hotfixes: ["px_scaling"] });
    } else {
      pdf.addPage([width, height], orientation);
    }
    pdf.addImage(canvas.toDataURL("image/jpeg", quality), "JPEG", 0, 0, width, height, undefined, "FAST");
    canvas.width = 1;
    canvas.height = 1;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!pdf) throw new Error("没有找到可生成的页面");
  const blob = pdf.output("blob");
  prepareDownload(blob, `${baseName(currentFile.name)}-innjan.pdf`);
  processButton.textContent = "重新生成并下载 PDF";
  setStatus(`PDF 已生成 · ${pages.length} 页 · ${formatBytes(blob.size)}`, 100);
  setTimeout(() => downloadButton.click(), 30);
}

async function renderDocx() {
  if (!window.docx?.renderAsync) throw new Error("DOCX 渲染组件未能载入");
  officePreview.replaceChildren();
  officeStyles.replaceChildren();
  setStatus("正在解析文字与版式", 18);
  revealOffice();
  await window.docx.renderAsync(await currentFile.arrayBuffer(), officePreview, officeStyles, {
    className: "docx", inWrapper: true, ignoreWidth: false, ignoreHeight: false,
    ignoreFonts: false, breakPages: true, renderHeaders: true, renderFooters: true, useBase64URL: true
  });
  if (officeOutput === "print") {
    setStatus("页面已还原，正在打开打印保存", 100);
    printOffice();
  } else {
    setStatus("页面已还原，正在生成 PDF", 56);
    await createOfficePdf("docx");
  }
}

async function renderPptx() {
  if (pptViewer?.destroy) pptViewer.destroy();
  pptViewer = null;
  officePreview.replaceChildren();
  officeStyles.replaceChildren();
  setStatus("正在拆解幻灯片", 10);
  revealOffice();
  officePreview.classList.add("pptx-viewer");
  try {
    const { PptxViewer, RECOMMENDED_ZIP_LIMITS } = await import("./vendor/pptx-renderer.browser.es.js");
    setStatus("正在重建图形与文字", 34);
    pptViewer = await PptxViewer.open(await currentFile.arrayBuffer(), officePreview, {
      zipLimits: RECOMMENDED_ZIP_LIMITS, renderMode: "list",
      listOptions: { windowed: false, showSlideLabels: false }
    });
    setStatus(`已还原 ${pptViewer.slideCount || "全部"} 页`, 56);
  } catch (error) {
    console.warn("PPTX renderer fallback", error);
    await renderPptxTextFallback();
    setStatus("已生成兼容文字版预览", 56);
  }
  if (officeOutput === "print") {
    setStatus("页面已还原，正在打开打印保存", 100);
    printOffice();
  } else {
    setStatus("正在生成 PDF", 58);
    await createOfficePdf("pptx");
  }
}

function printOffice() {
  document.body.classList.add("printing-office");
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-office"), { once: true });
  window.print();
}

async function renderPptxTextFallback() {
  if (!window.JSZip) throw new Error("PPTX 解析组件未能载入");
  const zip = await window.JSZip.loadAsync(await currentFile.arrayBuffer());
  const paths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  officePreview.replaceChildren();
  for (let index = 0; index < paths.length; index += 1) {
    const xml = await zip.file(paths[index]).async("string");
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    const words = [...parsed.getElementsByTagName("a:t")].map((node) => node.textContent.trim()).filter(Boolean);
    const slide = document.createElement("section");
    slide.dataset.slideIndex = String(index);
    slide.style.cssText = "aspect-ratio:16/9;background:#fff;margin:0 auto 18px;padding:7%;display:flex;flex-direction:column;justify-content:center;box-shadow:0 7px 20px rgba(0,0,0,.24);font-family:Arial,sans-serif;";
    const label = document.createElement("small");
    label.textContent = String(index + 1).padStart(2, "0");
    label.style.cssText = "color:#999;margin-bottom:4%;font-size:12px;";
    slide.append(label);
    words.forEach((word, wordIndex) => {
      const line = document.createElement(wordIndex === 0 ? "h2" : "p");
      line.textContent = word;
      line.style.cssText = wordIndex === 0 ? "font-size:clamp(20px,3vw,42px);margin:0 0 2%;" : "font-size:clamp(12px,1.5vw,22px);margin:.3% 0;line-height:1.45;";
      slide.append(line);
    });
    officePreview.append(slide);
  }
}

function waitFor(target, eventName) {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("浏览器无法读取这个媒体文件")); };
    const cleanup = () => { target.removeEventListener(eventName, done); target.removeEventListener("error", failed); };
    target.addEventListener(eventName, done, { once: true });
    target.addEventListener("error", failed, { once: true });
  });
}

async function createVideo(file) {
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto";
  const url = URL.createObjectURL(file);
  video.src = url;
  await waitFor(video, "loadedmetadata");
  return { video, url };
}

async function seek(video, time) {
  const bounded = Math.max(0, Math.min(time, Math.max(0, video.duration - .001)));
  if (Math.abs(video.currentTime - bounded) < .002 && video.readyState >= 2) return;
  const pending = waitFor(video, "seeked");
  video.currentTime = bounded;
  await pending;
}

async function createGif() {
  const { video, url } = await createVideo(currentFile);
  try {
    const start = Math.max(0, Number($("#gifStart").value) || 0);
    const requested = Math.max(.5, Math.min(12, Number($("#gifDuration").value) || 4));
    const duration = Math.min(requested, Math.max(.1, video.duration - start));
    if (start >= video.duration) throw new Error("起始时间超过了视频长度");
    const fps = Number($("#gifFps").value);
    const width = Number($("#gifWidth").value);
    const height = Math.max(2, Math.round((width * video.videoHeight / video.videoWidth) / 2) * 2);
    const frameCount = Math.min(180, Math.max(1, Math.ceil(duration * fps)));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const gif = GIFEncoder();
    for (let frame = 0; frame < frameCount; frame += 1) {
      await seek(video, start + frame / fps);
      context.drawImage(video, 0, 0, width, height);
      const rgba = context.getImageData(0, 0, width, height).data;
      const palette = quantize(rgba, 128, { format: "rgb444" });
      gif.writeFrame(applyPalette(rgba, palette, "rgb444"), width, height, { palette, delay: Math.round(1000 / fps), repeat: 0 });
      setStatus(`正在折叠第 ${frame + 1} / ${frameCount} 帧`, 5 + (frame + 1) / frameCount * 88);
      if (frame % 3 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: "image/gif" });
    const img = new Image(); img.alt = "生成的 GIF 预览"; img.src = URL.createObjectURL(blob);
    img.addEventListener("load", () => URL.revokeObjectURL(img.src), { once: true });
    revealMedia(img);
    prepareDownload(blob, `${baseName(currentFile.name)}-innjan.gif`);
    setStatus(`循环影像已生成 · ${formatBytes(blob.size)}`, 100);
  } finally { URL.revokeObjectURL(url); }
}

function floatTo16Bit(channel, start, count) {
  const output = new Int16Array(count);
  for (let i = 0; i < count; i += 1) {
    const sample = Math.max(-1, Math.min(1, channel[start + i] || 0));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}

async function createMp3() {
  if (!window.lamejs?.Mp3Encoder) throw new Error("MP3 编码组件未能载入");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("当前浏览器不支持音频解码");
  const context = new AudioContextClass();
  try {
    setStatus("正在分离视频音轨", 8);
    const audio = await context.decodeAudioData(await currentFile.arrayBuffer());
    const channels = Math.min(2, audio.numberOfChannels);
    const left = audio.getChannelData(0);
    const right = channels === 2 ? audio.getChannelData(1) : left;
    const encoder = new window.lamejs.Mp3Encoder(channels, audio.sampleRate, Number($("#mp3Bitrate").value));
    const pieces = [];
    for (let start = 0; start < audio.length; start += 1152) {
      const size = Math.min(1152, audio.length - start);
      const l = floatTo16Bit(left, start, size);
      const encoded = channels === 2 ? encoder.encodeBuffer(l, floatTo16Bit(right, start, size)) : encoder.encodeBuffer(l);
      if (encoded.length) pieces.push(new Int8Array(encoded));
      if ((start / 1152) % 40 === 0) { setStatus("正在蒸馏声音", 18 + start / audio.length * 74); await new Promise((resolve) => setTimeout(resolve, 0)); }
    }
    const tail = encoder.flush(); if (tail.length) pieces.push(new Int8Array(tail));
    const blob = new Blob(pieces, { type: "audio/mpeg" });
    const player = document.createElement("audio"); player.controls = true; player.src = URL.createObjectURL(blob);
    revealMedia(player);
    prepareDownload(blob, `${baseName(currentFile.name)}-innjan.mp3`);
    setStatus(`声音已提取 · ${formatBytes(blob.size)}`, 100);
  } finally { await context.close(); }
}

async function convertImage() {
  const sourceUrl = URL.createObjectURL(currentFile);
  try {
    const image = new Image(); image.src = sourceUrl; await waitFor(image, "load");
    setStatus("正在重排像素", 36);
    const canvas = document.createElement("canvas");
    const maxSide = isTouchPhone ? 4096 : 8192;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const type = $("#imageFormat").value;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, Number($("#imageQuality").value)));
    if (!blob) throw new Error("当前浏览器无法输出所选图片格式");
    const previewImage = new Image(); previewImage.alt = "转换后的图片预览"; previewImage.src = URL.createObjectURL(blob);
    previewImage.addEventListener("load", () => URL.revokeObjectURL(previewImage.src), { once: true });
    revealMedia(previewImage);
    const suffix = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
    prepareDownload(blob, `${baseName(currentFile.name)}-innjan.${suffix}`);
    const sizeNote = scale < 1 ? ` · 已适配手机至 ${canvas.width}×${canvas.height}` : "";
    setStatus(`图片已转换 · ${formatBytes(blob.size)}${sizeNote}`, 100);
  } finally { URL.revokeObjectURL(sourceUrl); }
}

function showSummary(title, detail) {
  const card = document.createElement("div");
  card.className = "result-summary";
  const heading = document.createElement("b");
  const copy = document.createElement("p");
  heading.textContent = title;
  copy.textContent = detail;
  card.append(heading, copy);
  revealMedia(card);
}

function autoSave(blob, filename) {
  prepareDownload(blob, filename);
  setTimeout(() => downloadButton.click(), 30);
}

async function mergePdfs() {
  const PDFDocument = window.PDFLib?.PDFDocument;
  if (!PDFDocument) throw new Error("PDF 合并组件未能载入");
  const output = await PDFDocument.create();
  let pageCount = 0;
  for (let index = 0; index < currentFiles.length; index += 1) {
    setStatus(`正在合入第 ${index + 1} / ${currentFiles.length} 份 PDF`, 8 + index / currentFiles.length * 76);
    const source = await PDFDocument.load(await currentFiles[index].arrayBuffer());
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    pageCount += pages.length;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const bytes = await output.save({ useObjectStreams: true });
  const blob = new Blob([bytes], { type: "application/pdf" });
  showSummary("合卷完成", `${currentFiles.length} 份文件 · ${pageCount} 页 · 已按左侧顺序编排`);
  autoSave(blob, `innjan-merged-${currentFiles.length}.pdf`);
  setStatus(`PDF 已合并 · ${pageCount} 页 · ${formatBytes(blob.size)}`, 100);
}

function watermarkPng(text, color, fontSize) {
  const ratio = 2;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `600 ${fontSize * ratio}px ${getComputedStyle(document.body).fontFamily}`;
  canvas.width = Math.ceil(context.measureText(text).width + fontSize * ratio);
  canvas.height = Math.ceil(fontSize * ratio * 1.7);
  const draw = canvas.getContext("2d");
  draw.font = `600 ${fontSize * ratio}px ${getComputedStyle(document.body).fontFamily}`;
  draw.textAlign = "center";
  draw.textBaseline = "middle";
  draw.fillStyle = color;
  draw.fillText(text, canvas.width / 2, canvas.height / 2);
  return { data: canvas.toDataURL("image/png"), width: canvas.width / ratio, height: canvas.height / ratio };
}

async function watermarkPdf() {
  const { PDFDocument, degrees } = window.PDFLib || {};
  if (!PDFDocument || !degrees) throw new Error("PDF 水印组件未能载入");
  const text = $("#watermarkText").value.trim();
  if (!text) throw new Error("请先填写水印文字");
  setStatus("正在读取 PDF 页面", 12);
  const pdf = await PDFDocument.load(await currentFile.arrayBuffer());
  const fontSize = Math.max(16, Math.min(160, Number($("#watermarkSize").value) || 48));
  const mark = watermarkPng(text, $("#watermarkColor").value, fontSize);
  const image = await pdf.embedPng(mark.data);
  const opacity = Number($("#watermarkOpacity").value);
  const angle = Number($("#watermarkAngle").value);
  const tiled = $("#watermarkPattern").value === "tile";
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    if (tiled) {
      const stepX = Math.max(mark.width + fontSize * 2.4, width / 3);
      const stepY = Math.max(mark.height + fontSize * 2.5, height / 4);
      let row = 0;
      for (let y = -mark.height; y < height + mark.height; y += stepY) {
        const offset = row % 2 ? stepX / 2 : 0;
        for (let x = -mark.width; x < width + mark.width; x += stepX) {
          page.drawImage(image, { x: x + offset, y, width: mark.width, height: mark.height, rotate: degrees(angle), opacity });
        }
        row += 1;
      }
    } else {
      page.drawImage(image, { x: (width - mark.width) / 2, y: (height - mark.height) / 2, width: mark.width, height: mark.height, rotate: degrees(angle), opacity });
    }
    setStatus(`正在铭印第 ${index + 1} / ${pages.length} 页`, 18 + (index + 1) / pages.length * 68);
  });
  const bytes = await pdf.save({ useObjectStreams: true });
  const blob = new Blob([bytes], { type: "application/pdf" });
  showSummary("水印完成", `${pages.length} 页 · “${text}” · ${tiled ? "铺满整页" : "页面中央"}`);
  autoSave(blob, `${baseName(currentFile.name)}-watermarked.pdf`);
  setStatus(`水印 PDF 已生成 · ${formatBytes(blob.size)}`, 100);
}

function uniqueZipName(zip, original, index) {
  const clean = (original || `file-${index + 1}`).replace(/^[/\\]+/, "").replace(/\.\.[/\\]/g, "");
  if (!zip.file(clean)) return clean;
  const dot = clean.lastIndexOf(".");
  return dot > 0 ? `${clean.slice(0, dot)}-${index + 1}${clean.slice(dot)}` : `${clean}-${index + 1}`;
}

async function createZip() {
  if (!window.JSZip) throw new Error("ZIP 组件未能载入");
  const zip = new window.JSZip();
  currentFiles.forEach((file, index) => zip.file(uniqueZipName(zip, file.webkitRelativePath || file.name, index), file));
  const level = Number($("#zipLevel").value);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level }, platform: "DOS" }, (meta) => setStatus(`正在封装 ${currentFiles.length} 个文件`, meta.percent));
  showSummary("收匣完成", `${currentFiles.length} 个文件 · ${formatBytes(blob.size)} · ZIP`);
  autoSave(blob, `innjan-archive-${currentFiles.length}.zip`);
  setStatus(`ZIP 已生成 · ${formatBytes(blob.size)}`, 100);
}

async function extractZip() {
  if (!window.JSZip) throw new Error("ZIP 组件未能载入");
  setStatus("正在检查压缩包结构", 8);
  const zip = await window.JSZip.loadAsync(await currentFile.arrayBuffer(), { createFolders: true });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (!entries.length) throw new Error("压缩包中没有可提取的文件");
  if (entries.length > 500) throw new Error("压缩包文件数超过 500，已为保护设备停止");
  const maxBytes = (isTouchPhone ? 250 : 800) * 1024 * 1024;
  const declaredBytes = entries.reduce((sum, entry) => sum + Number(entry?._data?.uncompressedSize || 0), 0);
  if (declaredBytes > maxBytes) throw new Error(`预计解压后超过 ${isTouchPhone ? 250 : 800} MB，已为保护设备停止`);
  let total = 0;
  const list = document.createElement("div");
  list.className = "extract-list";
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const blob = await entry.async("blob");
    total += blob.size;
    if (total > maxBytes) throw new Error(`解压后超过 ${isTouchPhone ? 250 : 800} MB，已为保护设备停止`);
    const url = URL.createObjectURL(blob);
    transientUrls.push(url);
    const row = document.createElement("div");
    row.className = "extract-row";
    const name = document.createElement("span");
    const save = document.createElement("a");
    name.textContent = `${entry.name} · ${formatBytes(blob.size)}`;
    save.textContent = "保存";
    save.href = url;
    save.download = entry.name.split("/").pop() || `file-${index + 1}`;
    row.append(name, save);
    list.append(row);
    setStatus(`正在解开第 ${index + 1} / ${entries.length} 个文件`, 12 + (index + 1) / entries.length * 82);
  }
  revealMedia(list);
  if (isTouchPhone) requestAnimationFrame(() => mediaResult.scrollIntoView({ behavior: "smooth", block: "start" }));
  saveNote.textContent = "压缩包已解开，请在右侧逐个保存需要的文件";
  saveNote.classList.add("show");
  setStatus(`已解开 ${entries.length} 个文件 · ${formatBytes(total)}`, 100);
}

async function imageToTarget() {
  const minBytes = Math.max(0, Number($("#targetMin").value)) * 1024 * 1024;
  const maxBytes = Math.max(minBytes, Number($("#targetMax").value) * 1024 * 1024);
  const type = $("#compressImageFormat").value;
  const url = URL.createObjectURL(currentFile);
  try {
    const image = new Image(); image.src = url; await waitFor(image, "load");
    const maxSide = isTouchPhone ? 4096 : 8192;
    let scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    let best = null;
    for (let resize = 0; resize < 5; resize += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (type === "image/jpeg") { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let low = .18, high = .95;
      for (let round = 0; round < 8; round += 1) {
        const quality = (low + high) / 2;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
        if (!blob) throw new Error("浏览器无法压缩这张图片");
        if (blob.size <= maxBytes) { best = blob; low = quality; } else high = quality;
        setStatus("正在逼近目标图片体积", 12 + (resize * 8 + round) / 48 * 76);
      }
      if (best && best.size >= minBytes * .85) break;
      if (best && best.size <= maxBytes) break;
      scale *= .78;
    }
    if (!best) throw new Error("无法在当前尺寸下达到目标范围，请提高最大体积");
    const suffix = type === "image/webp" ? "webp" : "jpg";
    const preview = new Image(); preview.alt = "压缩后的图片"; preview.src = URL.createObjectURL(best); transientUrls.push(preview.src);
    revealMedia(preview);
    autoSave(best, `${baseName(currentFile.name)}-compressed.${suffix}`);
    setStatus(`图片已压缩 · ${formatBytes(currentFile.size)} → ${formatBytes(best.size)}`, 100);
  } finally { URL.revokeObjectURL(url); }
}

async function videoToTarget() {
  if (currentFile.size > (isTouchPhone ? 180 : 600) * 1024 * 1024) throw new Error(`视频过大；当前设备建议不超过 ${isTouchPhone ? 180 : 600} MB`);
  const minMB = Math.max(.1, Number($("#targetMin").value) || .8);
  const maxMB = Math.max(minMB, Number($("#targetMax").value) || 1.5);
  const { video, url } = await createVideo(currentFile);
  const duration = video.duration;
  URL.revokeObjectURL(url);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("无法读取视频时长");
  setStatus("首次使用需联网加载视频引擎 · 约 31 MB", 4);
  if (!ffmpegInstance) {
    const { FFmpeg } = await import("./vendor/ffmpeg/ffmpeg/index.js");
    ffmpegInstance = new FFmpeg();
    let wasmBlobURL = "";
    try {
      const response = await fetch(FFMPEG_WASM_CDN, { mode: "cors", cache: "force-cache", credentials: "omit" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      wasmBlobURL = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: "application/wasm" }));
      await ffmpegInstance.load({
        coreURL: new URL("./vendor/ffmpeg/core/ffmpeg-core.js", location.href).href,
        wasmURL: wasmBlobURL
      });
    } catch (error) {
      ffmpegInstance.terminate();
      ffmpegInstance = null;
      throw new Error("视频引擎下载失败，请检查网络后重试");
    } finally {
      if (wasmBlobURL) URL.revokeObjectURL(wasmBlobURL);
    }
  }
  const inputExt = extension(currentFile) || "mp4";
  const inputName = `input.${inputExt}`;
  const outputName = "compressed.mp4";
  const targetBytes = ((minMB + maxMB) / 2) * .96 * 1024 * 1024;
  let totalKbps = Math.max(180, Math.floor(targetBytes * 8 / duration / 1000));
  const audioKbps = totalKbps < 320 ? 48 : 96;
  let videoKbps = Math.max(120, totalKbps - audioKbps);
  const progress = ({ progress: value }) => setStatus("正在压缩视频，请保持页面打开", 12 + Math.max(0, Math.min(1, value)) * 78);
  ffmpegInstance.on("progress", progress);
  try {
    await ffmpegInstance.writeFile(inputName, new Uint8Array(await currentFile.arrayBuffer()));
    const run = async () => {
      await ffmpegInstance.deleteFile(outputName).catch(() => {});
      const code = await ffmpegInstance.exec(["-i", inputName, "-c:v", "libx264", "-preset", "ultrafast", "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.15)}k`, "-bufsize", `${videoKbps * 2}k`, "-c:a", "aac", "-b:a", `${audioKbps}k`, "-movflags", "+faststart", outputName]);
      if (code !== 0) throw new Error("视频编码未完成；可能是不支持的原始编码");
      return ffmpegInstance.readFile(outputName);
    };
    let data = await run();
    if (data.length > maxMB * 1024 * 1024 * 1.08) {
      videoKbps = Math.max(100, Math.floor(videoKbps * (maxMB * 1024 * 1024 / data.length) * .9));
      data = await run();
    }
    const blob = new Blob([data], { type: "video/mp4" });
    const player = document.createElement("video"); player.controls = true; player.playsInline = true; player.src = URL.createObjectURL(blob); transientUrls.push(player.src);
    revealMedia(player);
    autoSave(blob, `${baseName(currentFile.name)}-compressed.mp4`);
    const rangeNote = blob.size >= minMB * 1024 * 1024 && blob.size <= maxMB * 1024 * 1024 ? "已进入目标范围" : "已尽量逼近目标范围";
    setStatus(`视频已压缩 · ${formatBytes(currentFile.size)} → ${formatBytes(blob.size)} · ${rangeNote}`, 100);
    await ffmpegInstance.deleteFile(inputName).catch(() => {});
    await ffmpegInstance.deleteFile(outputName).catch(() => {});
  } finally { ffmpegInstance.off("progress", progress); }
}

async function compressMedia() {
  return currentFile.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(extension(currentFile)) ? imageToTarget() : videoToTarget();
}

function friendlyError(error) {
  const message = String(error?.message || error || "");
  if (/encrypt|password/i.test(message)) return "这个 PDF 受密码保护，请先解锁后再处理";
  if (/memory|allocation|out of bounds/i.test(message)) return "设备内存不足，请缩短视频或减少文件数量后重试";
  if (/unsupported|codec|decode|demux/i.test(message)) return "当前浏览器无法读取这种媒体编码，请换用 MP4（H.264）或 WebM";
  return message || "转换没有完成，请换一个文件重试";
}

processButton.addEventListener("click", async () => {
  const hasInput = ["merge", "zip"].includes(currentMode) ? currentFiles.length > 0 : Boolean(currentFile);
  if (!hasInput || busy) return;
  busy = true;
  formulas.forEach((button) => button.disabled = true);
  processButton.disabled = true;
  printButton.disabled = true;
  processButton.dataset.readyPrint = "false";
  downloadButton.classList.remove("show");
  try {
    if (currentMode === "docx") await renderDocx();
    else if (currentMode === "pptx") await renderPptx();
    else if (currentMode === "gif") await createGif();
    else if (currentMode === "mp3") await createMp3();
    else if (currentMode === "image") await convertImage();
    else if (currentMode === "merge") await mergePdfs();
    else if (currentMode === "watermark") await watermarkPdf();
    else if (currentMode === "zip") await createZip();
    else if (currentMode === "unzip") await extractZip();
    else await compressMedia();
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), 0);
    processButton.textContent = "重新尝试";
  } finally {
    busy = false;
    officeOutput = "direct";
    formulas.forEach((button) => button.disabled = false);
    processButton.disabled = false;
    printButton.disabled = false;
  }
});

printButton.addEventListener("click", () => {
  if (!currentFile || busy || !["docx", "pptx"].includes(currentMode)) return;
  officeOutput = "print";
  processButton.click();
});

window.addEventListener("beforeunload", () => {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  transientUrls.forEach((url) => URL.revokeObjectURL(url));
  if (ffmpegInstance) ffmpegInstance.terminate();
});
switchMode("docx");
