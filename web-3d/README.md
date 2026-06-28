# Léa — palier 3D (Vite + Three.js)

Avatar **3D** stylisé (Three.js), branché sur la **même API** que le palier
SVG. Aucun asset distant : la tête est construite à partir de primitives et
animée par des signaux **synthétiques** (visèmes/regard/clignements) — jamais
de caméra (§1.4). Le moteur pédagogique est identique à tous les paliers (R6).

## Build & exécution

```bash
# 1) construire le bundle (depuis web-3d/)
npm install
npm run build          # tsc --noEmit && vite build → dist/

# 2) le serveur racine sert dist/ sous /3d/
cd .. && npm run serve
# puis ouvrir http://127.0.0.1:3000/3d/
```

En développement, `npm run dev` (Vite) sert l'app et proxifie `/sessions`,
`/dashboard`, `/health` vers l'API sur `localhost:3000`.

> `dist/` est un artefact de build (git-ignoré) : il faut donc lancer
> `npm run build` après un clone frais.

## Seam Ready Player Me (RPM)

`src/avatar3d.ts` construit la tête avec des primitives. Pour un vrai avatar
RPM : charger le **GLB** via `GLTFLoader` (`three/examples`), puis mapper
`parler()` et le regard sur ses **morph targets** (visèmes ARKit/Oculus) et ses
os de tête/yeux — l'interface (`parler`, `redimensionner`, `rendre`) ne change
pas. Le GLB nécessite un accès réseau (ou un asset local) hors de ce dépôt.
