# Hidden Cabinet — Interactive 3D Preview

**[Open the preview](https://nuugarn.github.io/preview/)**

A charcoal cabinet set flush into a matching matte wall, with warm display lighting and a concealed book-operated door.

- Tap/click the black book at the right of the third shelf to open: the book tilts outward 15°, then the cabinet swings inward 90°.
- Tap any visible part of the open cabinet to close. The book resets after the door closes.
- Drag to orbit; use the mouse wheel or pinch to zoom.
- Keyboard: focus the canvas, Enter/Space to activate; Home to reset the camera.

## Hosting

This is a static website. GitHub Pages serves the root of `main`. All browser dependencies and the GLB are included; no build step, account sign-in, or CDN is required to view it.

`index.html`, `style.css`, and `viewer.js` provide the viewer and interaction. `assets/hidden-cabinet.glb` contains the model and the embedded `Book_Secret_Door` animation. `Door_Hinge` and `Book_Trigger` are the two animation pivots. The custom tap behavior is implemented in `viewer.js`.

Dimensions are estimated for visual presentation, not fabrication. Mouse interaction and mobile touch emulation were tested in Chrome.

## Third-party assets

- Three.js r180 — MIT; see `vendor/three/LICENSE.txt`.
- Floor and stair wood textures: [Poly Haven American Walnut Veneer](https://polyhaven.com/a/american_walnut_veneer), CC0.
