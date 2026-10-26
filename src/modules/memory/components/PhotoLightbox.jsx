import { Maximize2, X } from "lucide-react";
import { useEffect } from "react";

export default function PhotoLightbox({ imageUrl, title, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-label={`Photo of ${title}`}
      className="fixed inset-0 m-0 z-50 flex h-full w-full items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo view"
          className="absolute -top-12 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-smooth"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/50 shadow-2xl">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-3xl"
          />
          {title && (
            <div className="bg-black/75 px-6 py-4 text-center">
              <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
