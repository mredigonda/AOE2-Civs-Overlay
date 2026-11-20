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

## With our game mod: glyph matching vs the OS's OCR (2026-11-19)

With `game-mod/` the bar is black with white numbers, and its layout (ours) says
where each number is. So each number is read from its own box: a villager count
can't be mistaken for an amount. The amounts' boxes stop at the next resource's
icon, where its villager count is (without that, 36% of the amounts read wrong).

- `extract_glyphs.py`: the game's digits, exactly: it draws text from signed distance
  field atlases (`resources/_common/fonts/combined*.png` and `.txt`), and a pixel is
  inside a glyph when the median of its R, G, B is above half. Two fonts; the numbers
  use `combined_sansserif` (`glyphs-preview.png`).
- `bench.py`: frames with the mod's layout and random values, at 1080p, 1440p and
  4K, read back by (A) glyph matching; writes boxes for (B).
- `ocr_vision.swift`: (B) Apple Vision's OCR on the same boxes (the closest thing on
  the Mac to Windows' built-in OCR).

| Reader | Right | Time |
|---|---|---|
| A. glyph matching (Python) | 6,600 of 6,600 | ~3.5 ms per frame of 11 numbers |
| B. Vision, fast | 61% | ~4 ms per number |
| B. Vision, accurate | 77% | ~92 ms per number |

Vision drops lone digits and reads "62/118" as "621118" and ":" as "..". So the
overlay uses A, in Rust (`src-tauri/src/hud.rs`), which also finds the bar on the
screen by the mod's grey letters (so any resolution, UI scale or bar position) and
the clock by the black box the mod puts behind it. `make_test_frames.py` makes whole
screens for its test (`cargo test --release --lib hud`): 99 of 99 values right,
0.2-0.3 ms per reading once the bar is found, under 25 ms to find it at 4K.

These frames are drawn with the same glyphs the reader matches against: the real
test is the game's own rendering, which the overlay's "Send to the Mac" button
captures.
