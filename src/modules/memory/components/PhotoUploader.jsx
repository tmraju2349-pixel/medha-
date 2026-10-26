import {
  Camera,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { fileToImageDataUrl } from "../services/audioUtils";

const PRESET_PHOTOS = [
  {
    label: "Mother / Family",
    url: "/assets/generated/memory-lakshmi.dim_800x600.jpg",
  },
  {
    label: "Wedding Day",
    url: "/assets/generated/memory-wedding.dim_800x600.jpg",
  },
  {
    label: "Childhood Home",
    url: "/assets/generated/memory-childhood-home.dim_800x600.jpg",
  },
  {
    label: "Bruno the Dog",
    url: "/assets/generated/memory-bruno.dim_800x600.jpg",
  },
  {
    label: "Mango Tree",
    url: "/assets/generated/memory-mango.dim_800x600.jpg",
  },
  {
    label: "City / Mumbai",
    url: "/assets/generated/memory-mumbai.dim_800x600.jpg",
  },
];

export default function PhotoUploader({ imageUrl, onChange }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (JPEG, PNG, WEBP).");
      return;
    }
    setUploadError(null);
    try {
      const dataUrl = await fileToImageDataUrl(file);
      onChange(dataUrl);
    } catch (_err) {
      setUploadError("Failed to read image file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
      setUrlDraft("");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-lg font-bold text-foreground flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
          Memory Photo
        </span>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-semibold text-destructive hover:underline flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Remove Photo
          </button>
        )}
      </div>

      {imageUrl ? (
        <div className="relative group overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-sm">
          <img
            src={imageUrl}
            alt="Memory preview"
            className="h-48 sm:h-56 w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-background/90 text-foreground px-4 py-2 text-sm font-bold shadow hover:bg-background"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full bg-destructive text-destructive-foreground px-4 py-2 text-sm font-bold shadow hover:bg-destructive/90"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            dragActive
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border bg-card/60 hover:bg-secondary/40"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              Drop a photo here, or click to upload
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cherished family portraits, places, or moments (JPG, PNG)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-smooth hover:opacity-90"
            >
              <Upload className="h-4 w-4" /> Browse Device
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPresets(!showPresets);
                setShowUrlInput(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Sparkles className="h-4 w-4 text-warning" /> Choose Sample Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(!showUrlInput);
                setShowPresets(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LinkIcon className="h-4 w-4" /> Paste Image URL
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {uploadError && (
        <p className="text-sm font-semibold text-destructive">{uploadError}</p>
      )}

      {showUrlInput && (
        <form onSubmit={handleApplyUrl} className="flex gap-2 mt-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/family-photo.jpg"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-base font-bold text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-secondary-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      )}

      {showPresets && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground">
              Select a memory photograph:
            </span>
            <button
              type="button"
              onClick={() => setShowPresets(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_PHOTOS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onChange(item.url);
                  setShowPresets(false);
                }}
                className="group relative overflow-hidden rounded-xl border border-border/80 hover:border-primary text-left transition-all"
              >
                <img
                  src={item.url}
                  alt={item.label}
                  className="h-20 w-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="block bg-card/90 px-2 py-1 text-xs font-semibold truncate">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
