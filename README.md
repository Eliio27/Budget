# Budget

Monatsbudget als Offline-PWA (eine HTML-Datei, Daten nur lokal im `localStorage`).

## Deploy (GitHub Pages)

Alle Pfade sind relativ – die App läuft auch in einem Unterordner.

**Bei jedem Deploy `CACHE_VERSION` in `sw.js` erhöhen** (z. B. `"v1"` → `"v2"`).
Sonst bekommen installierte Apps die neuen Dateien nicht. Nach dem Erhöhen erscheint
in der App „Neue Version verfügbar – Neu laden“.

Neue Dateien (Icons usw.) zusätzlich in die `ASSETS`-Liste in `sw.js` eintragen.
