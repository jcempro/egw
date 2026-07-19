// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export type IconSource = IconDefinition | Node | (() => Node) | null | undefined;

const SVG_NS = "http://www.w3.org/2000/svg";
function isNode(value: unknown): value is Node { return Boolean(value && typeof value === "object" && typeof (value as Node).nodeType === "number"); }
function fallbackIcon(documentRef: Document, fallback: string): HTMLElement { const node = documentRef.createElement("span"); node.className = "icon-fallback"; node.setAttribute("aria-hidden", "true"); node.dataset.iconProvider = "fallback"; node.textContent = fallback; return node; }

export function renderIcon(source: IconSource, fallback: string, documentRef: Document = document): Node {
  try {
    const resolved = typeof source === "function" ? source() : source;
    if (isNode(resolved)) {
      if (resolved.nodeType === 1) { const element = resolved as Element; element.setAttribute("aria-hidden", "true"); element.setAttribute("data-icon-provider", element.localName === "wa-icon" ? "webawesome" : "custom"); }
      return resolved;
    }
    if (!resolved || !Array.isArray(resolved.icon)) return fallbackIcon(documentRef, fallback);
    const [width, height, , unicode, path] = resolved.icon;
    if (!width || !height || (!Array.isArray(path) && typeof path !== "string")) return fallbackIcon(documentRef, fallback);
    const svg = documentRef.createElementNS(SVG_NS, "svg"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("width", "1em"); svg.setAttribute("height", "1em"); svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.setAttribute("class", "fa-icon"); svg.setAttribute("data-icon-provider", "font-awesome"); svg.setAttribute("data-icon-unicode", String(unicode || "")); svg.setAttribute("focusable", "false");
    for (const value of Array.isArray(path) ? path : [path]) { const child = documentRef.createElementNS(SVG_NS, "path"); child.setAttribute("d", value); child.setAttribute("fill", "currentColor"); svg.append(child); }
    return svg;
  } catch { return fallbackIcon(documentRef, fallback); }
}
