# Swibble Messestand

3D-Präsentation der Swibble-Printmedien für den Messeauftritt: doppelseitiges Roll-up, Podest (Flyeralarm „Messetheken rund“) und Rückwand (Flyeralarm „Textilfaltdisplay Classic“, 12 Felder).

- `index.html`, `js/` – Website mit three.js (lädt three.js und Poppins per CDN)
- `rollup/`, `podest/`, `rueckwand/` – Druckmotive als HTML im Maßstab 1 px = 1 mm
- `textures/` – daraus gerenderte PNGs, die im 3D-Modell verwendet werden

Lokal starten:

```bash
python3 -m http.server 5173
```
