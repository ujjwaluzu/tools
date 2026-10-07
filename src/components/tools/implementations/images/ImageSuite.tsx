"use client";

/* Blob URL previews are local browser resources and cannot use Next's image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { CopyButton, Dropzone, EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, formatBytes } from "@/components/tools/primitives";
import { canvasBlob, downloadBlob, inspectImage, readJpegExif, renderImage, safeImageName, sniffType, type ImageInfo, type ImageOutput } from "@/lib/tools/images/processing";

const labels: Record<string, string> = {
  convert: "Image converter", resize: "Image resizer", compress: "Image compressor", crop: "Image cropper", transform: "Image transform",
  adjust: "Image adjustments", base64: "Image to Base64", "base64-to-image": "Base64 to image", exif: "EXIF viewer", "remove-exif": "EXIF remover",
  favicon: "Favicon generator", "pwa-icons": "PWA icon generator", thumbnail: "Thumbnail generator", og: "OG image generator",
};
const accept = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/svg+xml", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"];
const formatExtensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" };

export function ImageSuite({ tool }: { tool?: string }) {
  const mode = tool ?? "convert";
  const [file, setFile] = useState<File | null>(null);
  const [safePreview, setSafePreview] = useState<Blob | null>(null);
  const [info, setInfo] = useState<ImageInfo | null>(null);
  const previewSource = safePreview ?? file;
  const previewUrl = useMemo(() => previewSource ? URL.createObjectURL(previewSource) : "", [previewSource]);
  const [output, setOutput] = useState<ImageOutput | null>(null);
  const [outputs, setOutputs] = useState<ImageOutput[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [format, setFormat] = useState("image/png");
  const [quality, setQuality] = useState(0.84);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [locked, setLocked] = useState(true);
  const [percentage, setPercentage] = useState(100);
  const [ratio, setRatio] = useState("free");
  const [cropRect, setCropRect] = useState({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0 });
  const [base64, setBase64] = useState("");
  const [decoded, setDecoded] = useState<{ blob: Blob; mime: string } | null>(null);
  const decodedUrl = useMemo(() => decoded ? URL.createObjectURL(decoded.blob) : "", [decoded]);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [ogTitle, setOgTitle] = useState("Your page title");
  const [ogSubtitle, setOgSubtitle] = useState("A short description for your page");
  const [ogBackground, setOgBackground] = useState("#296b52");
  const [alignment, setAlignment] = useState("left");
  const [logo, setLogo] = useState<File | null>(null);
  const [cropMode, setCropMode] = useState<"fit" | "crop" | "stretch">("fit");
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (decodedUrl) URL.revokeObjectURL(decodedUrl); }, [decodedUrl]);

  useEffect(() => {
    if (mode !== "og") return;
    const canvas = document.getElementById("og-preview") as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = 1200; canvas.height = 630;
    context.fillStyle = ogBackground; context.fillRect(0, 0, 1200, 630);
    context.fillStyle = "rgba(255,255,255,.13)"; context.beginPath(); context.arc(1100, 20, 320, 0, Math.PI * 2); context.fill();
    context.textAlign = alignment as CanvasTextAlign; context.textBaseline = "middle";
    const x = alignment === "left" ? 84 : alignment === "right" ? 1116 : 600;
    context.fillStyle = "rgba(255,255,255,.74)"; context.font = "600 26px system-ui"; context.fillText(ogSubtitle.slice(0, 95), x, 215, 1030);
    context.fillStyle = "white"; context.font = "700 66px system-ui";
    const words = ogTitle.split(/\s+/); let line = ""; let y = 310;
    for (const word of words) { const candidate = `${line}${word} `; if (context.measureText(candidate).width > 1020 && line) { context.fillText(line.trim(), x, y, 1030); line = `${word} `; y += 78; } else line = candidate; }
    context.fillText(line.trim(), x, y, 1030);
    if (logo) {
      let active = true; const url = URL.createObjectURL(logo); const image = new Image();
      image.onload = () => { if (active) context.drawImage(image, 84, 470, 85, 85); URL.revokeObjectURL(url); };
      image.onerror = () => URL.revokeObjectURL(url); image.src = url;
      return () => { active = false; URL.revokeObjectURL(url); };
    }
  }, [mode, ogTitle, ogSubtitle, ogBackground, alignment, logo]);

  async function choose(selection: { files: File[]; rejected: string[] }) {
    setError(selection.rejected.join(" ")); setOutput(null); setOutputs([]);
    const candidate = selection.files[0];
    if (!candidate) { setFile(null); setSafePreview(null); setInfo(null); return; }
    setWorking(true);
    try {
      const details = await inspectImage(candidate);
      const safeSvgPreview = details.type === "image/svg+xml" ? await renderImage(candidate, (context, bitmap) => context.drawImage(bitmap, 0, 0)) : null;
      setSafePreview(safeSvgPreview);
      setFile(candidate); setInfo(details); setWidth(details.width); setHeight(details.height); setFormat(details.type === "image/jpeg" ? "image/jpeg" : "image/png");
      if (details.type === "image/jpeg") {
        try { setMetadata(readJpegExif(await candidate.arrayBuffer())); }
        catch { setMetadata({}); }
      } else setMetadata({});
      setCropRect({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 }); setError("");
    } catch (caught) { setFile(null); setSafePreview(null); setInfo(null); setError(caught instanceof Error ? caught.message : "We couldn't process this image."); }
    finally { setWorking(false); }
  }

  function reset() {
    setFile(null); setSafePreview(null); setInfo(null); setOutput(null); setOutputs([]); setError(""); setBase64(""); setDecoded(null); setText(""); setMetadata({}); setLogo(null);
    setRotation(0); setFlipX(false); setFlipY(false); setQuality(0.84); setPercentage(100); setRatio("free"); setCropMode("fit"); setWidth(512); setHeight(512); setFormat("image/png"); setLocked(true); setOgTitle("Your page title"); setOgSubtitle("A short description for your page"); setOgBackground("#296b52"); setAlignment("left"); setCropRect({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0 });
  }

  async function exportCanvas(blob: Blob, name: string) { setOutput({ blob, name }); setOutputs([]); }

  async function process() {
    setError(""); setOutput(null); setOutputs([]);
    try {
      setWorking(true);
      if (mode === "base64-to-image") { await decodeBase64(); return; }
      if (mode === "og") {
        const canvas = document.getElementById("og-preview") as HTMLCanvasElement | null;
        if (!canvas) throw new Error("The preview is not ready yet.");
        const blob = await canvasBlob(canvas, "image/png");
        await exportCanvas(blob, "og-image.png");
        return;
      }
      if (!file || !info) throw new Error("Choose an image first.");
      if (mode === "base64") {
        if (file.size > 12 * 1024 * 1024) throw new Error("This image is too large for Base64 output. Choose an image under 12 MB to limit browser memory use.");
        const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const raw = btoa(binary); setBase64(text === "raw" ? raw : `data:${info.type};base64,${raw}`); return;
      }
      if (mode === "exif") return;
      if (mode === "favicon" || mode === "pwa-icons") {
        const sizes = mode === "favicon" ? [16, 32, 48] : [192, 512]; const generated: ImageOutput[] = [];
        for (const size of sizes) generated.push({ name: mode === "favicon" ? `favicon-${size}x${size}.png` : `icon-${size}x${size}.png`, blob: await renderImage(file, (ctx, bitmap) => drawSquareCrop(ctx, bitmap, size), size, size) });
        setOutputs(generated); return;
      }
      let blob: Blob; let outputName: string;
      const outType = mode === "compress" || mode === "convert" ? format : mode === "thumbnail" ? format : "image/png";
      if (mode === "resize") {
        const w = Math.round(width * percentage / 100), h = Math.round(height * percentage / 100);
        blob = await renderImage(file, (ctx, bitmap) => ctx.drawImage(bitmap, 0, 0, w, h), w, h, format, quality); outputName = safeImageName(file.name, "resized", formatExtensions[format] ?? "png");
      } else if (mode === "compress" || mode === "convert") {
        blob = await renderImage(file, (ctx, bitmap) => { if (format === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, bitmap.width, bitmap.height); } ctx.drawImage(bitmap, 0, 0); }, undefined, undefined, outType, quality);
        outputName = safeImageName(file.name, mode === "compress" ? "compressed" : "converted", formatExtensions[format] ?? "png");
      } else if (mode === "crop" || mode === "thumbnail") {
        let w = mode === "crop" ? Math.max(1, Math.round(info.width * cropRect.w)) : width;
        let h = mode === "crop" ? Math.max(1, Math.round(info.height * cropRect.h)) : height;
        if (mode === "thumbnail" && cropMode === "fit") { const scale = Math.min(w / info.width, h / info.height); w = Math.max(1, Math.round(info.width * scale)); h = Math.max(1, Math.round(info.height * scale)); }
        blob = await renderImage(file, (ctx, bitmap) => {
          if (mode === "crop") ctx.drawImage(bitmap, cropRect.x * bitmap.width, cropRect.y * bitmap.height, cropRect.w * bitmap.width, cropRect.h * bitmap.height, 0, 0, w, h);
          else if (cropMode === "crop") { const scale = Math.max(w / bitmap.width, h / bitmap.height); const sw = w / scale, sh = h / scale; ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, h); }
          else ctx.drawImage(bitmap, 0, 0, w, h);
        }, w, h, outType, quality);
        outputName = safeImageName(file.name, mode === "crop" ? "cropped" : "thumbnail", formatExtensions[outType] ?? "png");
      } else if (mode === "transform") {
        const sideways = rotation % 180 !== 0; const w = sideways ? info.height : info.width, h = sideways ? info.width : info.height;
        blob = await renderImage(file, (ctx, bitmap) => { ctx.translate(w / 2, h / 2); ctx.rotate(rotation * Math.PI / 180); ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1); ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2); }, w, h);
        outputName = safeImageName(file.name, "transformed");
      } else if (mode === "adjust") {
        blob = await renderImage(file, (ctx, bitmap) => { ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) grayscale(${adjustments.grayscale}%) blur(${adjustments.blur}px)`; ctx.drawImage(bitmap, 0, 0); });
        outputName = safeImageName(file.name, "adjusted");
      } else if (mode === "remove-exif") {
        blob = await renderImage(file, (ctx, bitmap) => ctx.drawImage(bitmap, 0, 0), undefined, undefined, "image/png"); outputName = safeImageName(file.name, "metadata-removed");
      } else throw new Error("This image operation is not available.");
      await exportCanvas(blob, outputName);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn't process this image. Please try another file."); }
    finally { setWorking(false); }
  }

  async function decodeBase64() {
    const value = base64.trim(); if (!value) throw new Error("Paste a Base64 value first.");
    if (value.length > 45_000_000) throw new Error("This Base64 value is too large to decode safely in your browser.");
    const match = value.match(/^data:(image\/(?:png|jpeg|webp|avif));base64,([\s\S]+)$/i);
    const mime = match?.[1].toLowerCase() ?? format;
    const encoded = match?.[2] ?? value.replace(/\s/g, "");
    if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) throw new Error("This doesn't look like valid Base64. Check that the complete value was pasted.");
    let binary: string; try { binary = atob(encoded); } catch { throw new Error("We couldn't decode this Base64 value."); }
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const candidate = new File([blob], `decoded.${formatExtensions[mime] ?? "png"}`, { type: mime });
    const detectedMime = await sniffType(candidate);
    if (detectedMime !== mime) throw new Error("The selected MIME type doesn't match the image data. Choose the correct type and try again.");
    await inspectImage(candidate);
    setDecoded({ blob, mime });
  }

  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }

  function updateCrop(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const p = point(event);
    let w = Math.max(0.06, Math.abs(p.x - dragStart.current.x));
    let h = Math.max(0.06, Math.abs(p.y - dragStart.current.y));
    if (ratio !== "free") {
      const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
      const target = (ratioWidth / ratioHeight) / aspectRatio;
      if (w / h > target) w = h * target;
      else h = w / target;
    }
    const x = Math.min(p.x, dragStart.current.x);
    const y = Math.min(p.y, dragStart.current.y);
    setCropRect({ x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) });
  }

  function nudgeCrop(dx: number, dy: number) {
    setCropRect((current) => ({ ...current, x: Math.max(0, Math.min(1 - current.w, current.x + dx)), y: Math.max(0, Math.min(1 - current.h, current.y + dy)) }));
  }

  const aspectRatio = info ? info.width / info.height : 1;
  const cropStyle = mode === "crop" ? { filter: `none` } : undefined;
  const adjustFilter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) grayscale(${adjustments.grayscale}%) blur(${adjustments.blur}px)`;
  const reduction = output && file ? Math.round((1 - output.blob.size / file.size) * 1000) / 10 : 0;

  return <div className="tool-workspace image-workspace">
    {mode !== "base64-to-image" && mode !== "og" && <Dropzone onFiles={choose} multiple={false} accept={accept} maxBytes={25 * 1024 * 1024} disabled={working} />}
    {mode === "og" && <div className="image-settings-grid">
      <label className="field-group"><span className="field-label">Title</span><input className="text-input" value={ogTitle} maxLength={100} onChange={(event) => setOgTitle(event.target.value)} /></label>
      <label className="field-group"><span className="field-label">Subtitle</span><input className="text-input" value={ogSubtitle} maxLength={150} onChange={(event) => setOgSubtitle(event.target.value)} /></label>
      <label className="field-group"><span className="field-label">Background color</span><input className="text-input color-picker-input" type="color" value={ogBackground} onChange={(event) => setOgBackground(event.target.value)} /></label>
      <label className="field-group"><span className="field-label">Text alignment</span><select className="text-input" value={alignment} onChange={(event) => setAlignment(event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label className="field-group"><span className="field-label">Optional logo</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const selected = event.target.files?.[0] ?? null; setLogo(null); if (!selected) return; try { const logoType = await sniffType(selected); if (!["image/png", "image/jpeg", "image/webp"].includes(logoType ?? "")) throw new Error("Choose a PNG, JPG, or WebP logo."); await inspectImage(selected); setLogo(selected); setError(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Choose a readable PNG, JPG, or WebP logo."); } }} /></label>
      <canvas id="og-preview" className="og-preview" aria-label="Open Graph image preview" />
    </div>}
    {mode === "base64-to-image" && <div className="field-group"><label className="field-label" htmlFor="image-base64-input">Image Data URL or raw Base64</label><textarea id="image-base64-input" className="code-input" value={base64} onChange={(event) => { setBase64(event.target.value); setDecoded(null); }} placeholder="data:image/png;base64,... or paste raw Base64" /><label className="field-label">MIME type for raw Base64</label><select className="text-input" value={format} onChange={(event) => setFormat(event.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/avif">AVIF</option></select></div>}
    {mode === "base64" && <div className="field-group"><span className="field-label">Output format</span><div className="segmented-control"><button type="button" className={text !== "raw" ? "selected" : ""} aria-pressed={text !== "raw"} onClick={() => setText("")}>Data URL</button><button type="button" className={text === "raw" ? "selected" : ""} aria-pressed={text === "raw"} onClick={() => setText("raw")}>Raw Base64</button></div><small>Base64 is an encoding, not encryption. Large images create much larger text.</small></div>}
    {file && info && <>
      <div className="image-file-summary"><div className="image-preview-frame"><img src={previewUrl} alt={`Preview of ${file.name}`} style={{ transform: `rotate(${rotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`, filter: mode === "adjust" ? adjustFilter : undefined, ...cropStyle }} /></div>
        <div className="image-facts"><strong title={file.name}>{file.name}</strong><span>{formatBytes(file.size)} · {info.width} × {info.height}</span><span>{info.type.replace("image/", "").toUpperCase()}</span></div></div>
      {mode === "crop" && <><div className="crop-editor" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); dragStart.current = p; setCropRect({ x: p.x, y: p.y, w: 0.01, h: 0.01 }); }} onPointerMove={updateCrop} onPointerUp={() => { dragStart.current = null; }}>
        <img ref={imageRef} src={previewUrl} alt="Select a crop area by dragging over the image" />
        <span className="crop-selection" style={{ left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%` }} />
      </div><label className="field-group"><span className="field-label">Aspect ratio</span><select className="text-input" value={ratio} onChange={(event) => setRatio(event.target.value)}><option value="free">Free crop</option><option value="1:1">1:1</option><option value="4:3">4:3</option><option value="3:2">3:2</option><option value="16:9">16:9</option></select></label><div className="preset-row" aria-label="Nudge crop selection">{[["left", -0.02, 0], ["up", 0, -0.02], ["down", 0, 0.02], ["right", 0.02, 0]].map(([direction, dx, dy]) => <button key={direction} type="button" className="button button-secondary" aria-label={`Move crop area ${direction}`} onClick={() => nudgeCrop(Number(dx), Number(dy))}>Move {direction}</button>)}</div></>}
      {mode === "resize" && <><div className="image-settings-grid"><label className="field-group"><span className="field-label">Width (px)</span><input className="text-input" type="number" min="1" max="12000" value={width} onChange={(event) => { const next = Number(event.target.value); setWidth(next); if (locked && next > 0) setHeight(Math.round(next / aspectRatio)); }} /></label><label className="field-group"><span className="field-label">Height (px)</span><input className="text-input" type="number" min="1" max="12000" value={height} onChange={(event) => { const next = Number(event.target.value); setHeight(next); if (locked && next > 0) setWidth(Math.round(next * aspectRatio)); }} /></label></div><label className="inline-check"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} />Lock aspect ratio</label><label className="field-group"><span className="field-label">Scale: {percentage}%</span><input aria-label="Resize percentage" type="range" min="10" max="200" value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} /></label><div className="preset-row">{[[256, 256], [512, 512], [1024, 1024], [1280, 720], [1920, 1080]].map(([presetWidth, presetHeight]) => <button key={`${presetWidth}x${presetHeight}`} className="button button-secondary" type="button" onClick={() => { setWidth(presetWidth); setHeight(presetHeight); setLocked(presetWidth === presetHeight); }}> {presetWidth} × {presetHeight}</button>)}</div></>}
      {mode === "compress" && <><FormatControl format={format} setFormat={setFormat} /><QualityControl quality={quality} setQuality={setQuality} disabled={format === "image/png"} /></>}
      {mode === "convert" && <><FormatControl format={format} setFormat={setFormat} />{format !== "image/png" && <QualityControl quality={quality} setQuality={setQuality} />}</>}
      {mode === "thumbnail" && <><div className="image-settings-grid"><label className="field-group"><span className="field-label">Width (px)</span><input className="text-input" type="number" min="1" max="12000" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><label className="field-group"><span className="field-label">Height (px)</span><input className="text-input" type="number" min="1" max="12000" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label><label className="field-group"><span className="field-label">Sizing</span><select className="text-input" value={cropMode} onChange={(event) => setCropMode(event.target.value as "fit" | "crop" | "stretch")}><option value="fit">Fit (no distortion)</option><option value="crop">Crop to fill</option><option value="stretch">Stretch (distort)</option></select></label><label className="field-group"><span className="field-label">Output</span><select className="text-input" value={format} onChange={(event) => setFormat(event.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></label></div><div className="preset-row">{[[128, 128], [256, 256], [320, 180], [640, 360], [1280, 720]].map(([presetWidth, presetHeight]) => <button key={`${presetWidth}x${presetHeight}`} className="button button-secondary" type="button" onClick={() => { setWidth(presetWidth); setHeight(presetHeight); }}> {presetWidth} × {presetHeight}</button>)}</div><QualityControl quality={quality} setQuality={setQuality} /></>}
      {mode === "transform" && <div className="preset-row"><button type="button" className="button button-secondary" onClick={() => setRotation((rotation + 90) % 360)}>Rotate 90°</button><button type="button" className="button button-secondary" onClick={() => setRotation((rotation + 180) % 360)}>Rotate 180°</button><button type="button" className="button button-secondary" onClick={() => setRotation((rotation + 270) % 360)}>Rotate 270°</button><button type="button" className="button button-secondary" aria-pressed={flipX} onClick={() => setFlipX(!flipX)}>Flip horizontal</button><button type="button" className="button button-secondary" aria-pressed={flipY} onClick={() => setFlipY(!flipY)}>Flip vertical</button></div>}
      {mode === "adjust" && <div className="adjustment-grid">{Object.entries(adjustments).map(([key, value]) => <div key={key} className="field-group"><label className="field-label" htmlFor={`adjust-${key}`}>{key[0].toUpperCase() + key.slice(1)}: {value}{key === "blur" ? " px" : "%"}</label><input id={`adjust-${key}`} type="range" min={0} max={key === "blur" ? 10 : 200} value={value} onChange={(event) => setAdjustments({ ...adjustments, [key]: Number(event.target.value) })} /><button type="button" className="button button-quiet" onClick={() => setAdjustments({ ...adjustments, [key]: key === "brightness" || key === "contrast" || key === "saturation" ? 100 : 0 })}>Reset {key.toLowerCase()}</button></div>)}</div>}
      {(mode === "exif" || mode === "remove-exif") && <div className="metadata-status">{Object.keys(metadata).length ? <><p>Metadata found in the readable JPEG EXIF fields below. GPS/location data can be sensitive.</p><dl>{Object.entries(metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></> : <p>{info.type === "image/jpeg" ? "No readable EXIF fields were found." : "This format does not expose EXIF metadata through this local viewer."}</p>}{mode === "remove-exif" && <p>Metadata removal re-encodes this image as PNG. Browser canvas output omits source metadata; metadata in unsupported formats may not be detected.</p>}</div>}
    </>}
    {mode === "base64-to-image" && decoded && decodedUrl && <div className="decoded-preview"><img src={decodedUrl} alt="Decoded Base64 image preview" /><span>Detected MIME type: {decoded.mime}</span></div>}
    {mode === "og" && <p className="field-help">1200 × 630 PNG · This tool creates a single image, not a layered design file.</p>}
    {error && <ErrorState>{error}</ErrorState>}
    {working && <LoadingState label={mode === "favicon" || mode === "pwa-icons" ? "Generating icons locally…" : "Processing locally…"} />}
    <div className="pdf-primary-actions"><button type="button" className="button button-primary" disabled={working || (mode !== "base64-to-image" && mode !== "og" && !file)} onClick={() => void process()}>{actionLabel(mode)}</button><ResetButton onClick={reset} label="Reset" disabled={working} /></div>
    <ResultPanel title={output ? `${output.name} ready` : outputs.length ? `${outputs.length} files ready` : labels[mode] ?? "Image tool"}>
      {output ? <div className="image-output"><div className="image-output-summary"><strong>{formatBytes(output.blob.size)}</strong>{mode === "compress" && <span>{reduction > 0 ? `${reduction}% smaller` : `Output is ${Math.abs(reduction)}% larger; this format did not reduce the file size.`}</span>}</div>{mode === "compress" && file && <p>Original: {formatBytes(file.size)} · Compressed: {formatBytes(output.blob.size)} · Reduction: {reduction > 0 ? `${reduction}%` : "No reduction"}</p>}<button className="button button-primary" type="button" onClick={() => downloadBlob(output.blob, output.name)}>Download {output.name}</button></div>
        : outputs.length ? <div className="image-downloads">{outputs.map((item) => <div key={item.name}><span>{item.name}<small>{formatBytes(item.blob.size)}</small></span><button type="button" className="button button-secondary" onClick={() => downloadBlob(item.blob, item.name)}>Download</button></div>)}{mode === "pwa-icons" && <pre>{JSON.stringify({ icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }] }, null, 2)}</pre>}</div>
        : base64 && mode === "base64" ? <div className="base64-result"><div className="button-row"><CopyButton value={base64} /><button className="button button-secondary" type="button" onClick={() => downloadBlob(new Blob([base64], { type: "text/plain" }), "image-base64.txt")}>Download text</button></div><textarea className="code-input" readOnly value={base64} aria-label="Encoded image Base64 result" /></div>
        : decoded && mode === "base64-to-image" ? <div className="image-output"><p>{decoded.mime} · {formatBytes(decoded.blob.size)}</p><button className="button button-primary" type="button" onClick={() => downloadBlob(decoded.blob, `decoded.${formatExtensions[decoded.mime] ?? "png"}`)}>Download image</button></div>
        : <EmptyState title="Your result will appear here">Choose an image and adjust the settings, then run the tool.</EmptyState>}
    </ResultPanel>
  </div>;
}

function FormatControl({ format, setFormat }: { format: string; setFormat: (value: string) => void }) {
  return <label className="field-group"><span className="field-label">Output format</span><select className="text-input" value={format} onChange={(event) => setFormat(event.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option><option value="image/avif">AVIF (when supported by browser)</option></select></label>;
}
function QualityControl({ quality, setQuality, disabled = false }: { quality: number; setQuality: (value: number) => void; disabled?: boolean }) {
  return <label className="field-group"><span className="field-label">Quality: {Math.round(quality * 100)}%</span><input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} aria-label="Image quality" disabled={disabled} /><small>{disabled ? "PNG is lossless; choose JPEG or WebP to adjust quality." : "Used by lossy output formats such as JPEG and WebP."}</small></label>;
}
function actionLabel(mode: string): string {
  const actions: Record<string, string> = { convert: "Convert image", resize: "Resize image", compress: "Compress image", crop: "Crop image", transform: "Apply transform", adjust: "Export adjusted image", base64: "Convert to Base64", "base64-to-image": "Decode image", exif: "Read metadata", "remove-exif": "Remove metadata and export", favicon: "Generate favicons", "pwa-icons": "Generate PWA icons", thumbnail: "Generate thumbnail", og: "Download OG image" };
  return actions[mode] ?? "Process image";
}

function drawSquareCrop(context: CanvasRenderingContext2D, image: ImageBitmap, size: number): void {
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
}
