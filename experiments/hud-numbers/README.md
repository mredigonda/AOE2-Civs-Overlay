# Reading the HUD's numbers (prototype)

`hud_read.py` reads AoE2's numbers from a screenshot without general OCR: it keeps
the near-white pixels (the game draws numbers white with a dark outline on brown
stone), cuts them into glyphs and compares each glyph's shape with digit templates.

```bash
python3 -I experiments/hud-numbers/hud_read.py test-screenshot.png 0,0,2600,140
```

On `test-screenshot.png` (3840 px wide), with templates drawn from Arial (not the
game's font), 2026-11-19:

| Field | Real | Read |
|---|---|---|
| Clock | 00:03:50 | 000350 ✓ |
| Wood, gold | 290, 1890 | 290, 1890 ✓ |
| Food, stone | 0, 600 | 6, 660 ✗ (0 read as 6) |
| Villagers per resource | 6, 5, 2, 1 | 6, 5, 2, 1 ✓ |
| Villagers, population | 15, 16/35 | 15, 16/35 ✓ |

The two misses are the same 0↔6 confusion; templates cut from the game's own
digits (a few labeled screenshots) should remove it. The earlier experiments
(`python-experiment-*`) ran general OCR models (Tesseract, RapidOCR) over the
whole HUD; those are made for document text, not small outlined digits on a
textured background, which is likely why they did poorly.
