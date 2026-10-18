# Looks

A look is a set of design tokens: color, headline type, corner radius and background texture. The page's CSS only reads tokens, so a look changes the whole feel without touching components.

## Where the tokens live

- Source of truth: `tools/looks.py`.
- Generated blocks: between `/*LOOKS_START*/` and `/*LOOKS_END*/` in `dist/app.html` and `dist/console.html`, written by `tools/build-app.py`. Do not hand edit them.
- Regenerate: `npm run build`. Check contrast with `python3 tools/contrast.py`.

## Token names

`--bg --surface --surface2 --ink --ink2 --ink3 --line --line2 --accent --accent-ink --accent-soft --gain --gain-soft --ok --ok-soft --warn --warn-soft --bad --bad-soft --hl --shadow --shadow-s --bgimg --av-l --av-fg`

Type and shape: `--f-display --d-stretch --d-wt --d-h1wt --d-case --d-track --h1 --h2 --h1lh --brand --brand-case --r --r-lg`

- ink, ink2 and ink3 are the three text emphasis levels (primary, supporting, helper). Keep that hierarchy.
- gain is the amber used for the Required Output card. accent is the interactive color.

## Add or change a look

1. In `tools/looks.py`, copy one entry in `LOOKS`, give it a new key, and edit `light` and `dark` palettes, `type` and `shape`.
2. Add its display font to the Google Fonts link in `src/head.html`.
3. Add the key to the allowed list in `api/_rooms.js` (`look`) and an entry to `LOOKS` in `src/console.src.html` so organizers can pick it.
4. Add the key to the list in `tools/build-app.py`, then `npm run build` and `python3 tools/contrast.py`. Contrast must report zero issues.

## Rules the three looks follow

- Every text and accent pairing passes WCAG AA (4.5:1), body text on surface passes 7:1.
- Light and dark are designed separately, not inverted.
- One star per scene: the Required Output card. Everything else stays quieter.
- Depth is subtle: layered shadows and a faint texture, never competing with the star.
- Motion is one staggered reveal when the scene changes, and it respects reduced motion.
