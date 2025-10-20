// src/components/form/AvatarUploader.jsx
import React from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AvatarUploader({
  label = "Profile Picture",
  name = "avatar",
  onChange,
  required = false,
  containerClassName = "",
  accept = ["image/jpeg", "image/png", "image/webp"],
  maxFileSize = 5 * 1024 * 1024, // 2MB
}) {
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [rawFile, setRawFile] = React.useState(null);

  // crop state
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState(null);

  function revoke(url) {
    if (url) URL.revokeObjectURL(url);
  }

  function handleLocalChange(file) {
    if (!file) return;
    if (!accept.includes(file.type)) {
      return toastErr("Only JPEG/PNG/WEBP allowed");
    }
    if (file.size > maxFileSize) {
      return toastErr("Max file size is 2MB");
    }
    const url = URL.createObjectURL(file);
    setRawFile(file);
    setPreviewUrl((old) => {
      revoke(old);
      return url;
    });
    setCropOpen(true);
  }

  function onFileInput(e) {
    const file = e.target.files?.[0] || null;
    handleLocalChange(file);
    // reset input so selecting the same file re-triggers
    e.target.value = "";
  }

  function toastErr(msg) {
    // optional: wire to your toasts; fallback to alert
    if (typeof window !== "undefined" && window?.sonner) window.sonner.toast.error(msg);
    else console.error(msg);
  }

  async function onCropComplete() {
    if (!rawFile || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(previewUrl, croppedAreaPixels, "image/webp");
      const file = new File([blob], normalizeName(rawFile.name, "webp"), { type: "image/webp" });

      // send back as if from <input type="file">
      onChange?.({ target: { name, files: [file], value: file } });

      setCropOpen(false);
      // keep preview of cropped file
      const newUrl = URL.createObjectURL(file);
      setPreviewUrl((old) => {
        revoke(old);
        return newUrl;
      });
      setRawFile(file);
    } catch (e) {
      console.error(e);
      toastErr("Failed to crop image");
    }
  }

  function removeImage() {
    setRawFile(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(false);
    setPreviewUrl((old) => {
      revoke(old);
      return null;
    });
    // clear field upstream
    onChange?.({ target: { name, files: [], value: null } });
  }

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <label className="text-sm font-medium">
        {label}{required ? " *" : ""}
      </label>

      {/* Dropzone-style trigger */}
      <label className="group flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted transition">
        <div className="h-12 w-12 rounded-full bg-muted overflow-hidden ring-1 ring-border flex items-center justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt="avatar preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">Avatar</span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium leading-none">
            {previewUrl ? "Change photo" : "Upload photo"}
          </div>
          <div className="text-xs text-muted-foreground">
            JPEG/PNG/WebP · up to 2MB
          </div>
        </div>
        <input
          type="file"
          accept={accept.join(",")}
          onChange={onFileInput}
          className="hidden"
        />
      </label>

      {previewUrl && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setCropOpen(true)}>
            Re-crop
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
            Remove
          </Button>
        </div>
      )}

      {/* Crop dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
            {previewUrl && (
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                restrictPosition={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            )}
          </div>

          {/* zoom control */}
          <div className="mt-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setCropOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onCropComplete}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** utils */
function normalizeName(original, forceExt = "webp") {
  const base = original.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
  return `${base}-cropped.${forceExt}`;
}

async function getCroppedBlob(imageSrc, crop, mime = "image/webp") {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // enforce square 512x512 output (nice balance of quality/size)
  const outSize = 512;
  canvas.width = outSize;
  canvas.height = outSize;

  const { x, y, width, height } = crop;

  // draw cropped area scaled to 512x512
  ctx.drawImage(
    img,
    x, y, width, height,   // source rect
    0, 0, outSize, outSize // dest rect
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      mime,
      0.92
    );
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
