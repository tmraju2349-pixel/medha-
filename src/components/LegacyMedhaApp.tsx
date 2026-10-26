/* Ground-truth parity migration: preserve the uploaded MEDHA DOM, styles, content, and behavior. */
import { useEffect, useMemo, useRef } from "react";
import legacyHtml from "../legacy/index.html?raw";
import legacyMemoryHtml from "../legacy/memory-companion.html?raw";
import legacyTreasureHtml from "../legacy/treasure-hunt.html?raw";
import legacyFocusHtml from "../legacy/focus-quest-standalone.html?raw";

const assetUrls: Record<string, string> = {
  "family-moloi.png": "/family-moloi.svg",
  "family-pooja.png": "/family-pooja.svg",
  "family-rohan.png": "/family-rohan.svg",
};

function bodyOf(source: string) {
  const match = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match?.[1] ?? source)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/(src|href)=["'](family-(?:moloi|pooja|rohan)\.png)["']/gi, (_m, attr, name) => `${attr}="${assetUrls[name]}"`);
}

function stylesOf(source: string) {
  return Array.from(source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join("\n");
}

function scriptsOf(source: string) {
  return Array.from(source.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1])
    .filter((script) => !script.includes("tailwind.config"))
    .join("\n");
}

function replaceFunction(source: string, name: string, nextName: string, replacement: string) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  if (start < 0 || end < 0) return source;
  return `${source.slice(0, start)}${replacement}\n${source.slice(end)}`;
}

function normalizeLegacyGlobals() {
  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    if (!originalFetch) return;

    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const value = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const normalized = value.startsWith("./") ? value.slice(2) : value;
      const legacyPage = /^(?:memory-companion|treasure-hunt|focus-quest-standalone)\.html$/.test(normalized) ? "/" : normalized;
      return originalFetch(legacyPage, init);
    };

    try {
      window.fetch = customFetch as typeof window.fetch;
    } catch {
      try {
        Object.defineProperty(window, "fetch", {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        // window.fetch is read-only in this iframe environment; ignore
      }
    }
  } catch (err) {
    console.warn("Could not patch window.fetch:", err);
  }
}

type NativeGameHost = (id: "talk" | "treasure") => void;

type MedhaWindow = Window & { __mountMedhaGame?: NativeGameHost };

export default function LegacyMedhaApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyMarkup = useMemo(() => bodyOf(legacyHtml), []);
  const css = useMemo(() => stylesOf(legacyHtml), []);

  useEffect(() => {
    if (!rootRef.current) return;
    normalizeLegacyGlobals();
    const medhaWindow = window as MedhaWindow;
    medhaWindow.__mountMedhaGame = (id) => {
      const source = id === "talk" ? legacyMemoryHtml : legacyTreasureHtml;
      const host = document.getElementById("gameBody");
      const overlay = document.getElementById("gameOverlay");
      if (!host) return;
      if (overlay) {
        overlay.classList.remove("hidden");
        overlay.classList.add("flex");
      }
      host.innerHTML = `<style>${stylesOf(source)}</style>${bodyOf(source)}`;
      const gameScript = scriptsOf(source);
      const execute = new Function("window", "document", "navigator", "localStorage", "sessionStorage", gameScript);
      execute(window, document, navigator, window.localStorage, window.sessionStorage);
      window.setTimeout(() => {
        if (typeof window.onload === "function") window.onload(new Event("load"));
      }, 0);
    };

    let appScript = scriptsOf(legacyHtml);
    appScript = replaceFunction(appScript, "gameTalk", "gameTreasure", 'function gameTalk(){window.__mountMedhaGame("talk");}');
    appScript = replaceFunction(appScript, "gameTreasure", "gameMatch", 'function gameTreasure(){window.__mountMedhaGame("treasure");}');
    appScript = replaceFunction(appScript, "openEmbeddedGame", "const SYM", 'function openEmbeddedGame(id){if(id === "talk" || id === "treasure") window.__mountMedhaGame(id);}\n');
    const execute = new Function("window", "document", "navigator", "localStorage", "sessionStorage", appScript);
    execute(window, document, navigator, window.localStorage, window.sessionStorage);
    window.setTimeout(() => {
      if (typeof window.onload === "function") window.onload(new Event("load"));
    }, 0);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: bodyMarkup }} />
      <div id="react-migration-page-sources" hidden aria-hidden="true">
        <template data-page="memory-companion">{bodyOf(legacyMemoryHtml)}</template>
        <template data-page="treasure-hunt">{bodyOf(legacyTreasureHtml)}</template>
        <template data-page="focus-quest-standalone">{bodyOf(legacyFocusHtml)}</template>
      </div>
    </>
  );
}
