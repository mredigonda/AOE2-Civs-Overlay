//! Reads the game's resource bar off the screen, with our game mod on.
//!
//! The mod (game-mod/) draws the bar black, with a grey letter in the corner of each
//! resource's icon (W F G S V) and white numbers. So:
//!
//! 1. Layout: the mod's own resourcepanel.json says where every number is drawn,
//!    relative to the wood icon (in the game's 3840 x 2160 UI units).
//! 2. Calibration: on the screen, the grey letters on black give where the wood icon
//!    is and the UI's scale (their spacing), whatever the resolution or UI scale.
//! 3. Reading: each number from its own box (so a villager count is never mistaken
//!    for an amount): keep the white pixels, cut them into glyphs, and match each
//!    glyph with the game's own digits (from its font atlas, hud_glyphs.json).
//!
//! Benchmark (experiments/hud-numbers): 100% of 6,600 numbers on frames drawn like
//! the game's, at 1080p, 1440p and 4K; Apple's OCR got 61-77% of them.

use image::RgbaImage;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;

const MOD_TITLE: &str = "AoE2 Overlay Mod";
const RESOURCES: [&str; 5] = ["Wood", "Food", "Gold", "Stone", "Population"];

#[derive(Clone, Copy, Debug)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Where each number is, in UI units relative to the wood icon's top-left corner.
#[derive(Clone, Debug)]
pub struct Layout {
    icon_w: f64,
    icon_h: f64,
    spacing: f64, // between the wood and food icons
    boxes: Vec<(String, Rect)>,
}

#[derive(Clone, Copy, Debug)]
pub struct Calib {
    x: f64, // the wood icon's top-left corner on the screen, in pixels
    y: f64,
    scale: f64, // screen pixels per UI unit
}

struct State {
    calib: Option<Calib>,
    clock: Option<(f64, f64, f64, f64)>, // the clock's box on the screen, in pixels
}

static STATE: Mutex<State> = Mutex::new(State { calib: None, clock: None });

// ---- the mod's files ----

/// The mod's folder: in the game profile's mods/local, on Windows or in the
/// Porting Kit wrapper on macOS.
pub fn mod_dir() -> Option<PathBuf> {
    let mut profiles: Vec<PathBuf> = Vec::new();
    if let Ok(home) = std::env::var("USERPROFILE") {
        profiles.push(Path::new(&home).join("Games").join("Age of Empires 2 DE"));
    }
    if cfg!(target_os = "macos") {
        if let Ok(apps) = std::fs::read_dir("/Applications") {
            for app in apps.flatten() {
                let name = app.file_name().to_string_lossy().to_string();
                if name.starts_with("Age of Empires 2 Definitive Ed") {
                    let users = app.path().join("Contents/SharedSupport/prefix/drive_c/users");
                    for user in std::fs::read_dir(users).into_iter().flatten().flatten() {
                        profiles.push(user.path().join("Games").join("Age of Empires 2 DE"));
                    }
                }
            }
        }
    }
    for p in profiles {
        for id in std::fs::read_dir(&p).into_iter().flatten().flatten() {
            let dir = id.path().join("mods").join("local").join(MOD_TITLE);
            if dir.join("widgetui").join("resourcepanel.json").exists() {
                return Some(dir);
            }
        }
    }
    None
}

fn num(v: &Value, k: &str) -> f64 {
    v.get(k).and_then(|x| x.as_f64()).unwrap_or(0.0)
}

pub fn load_layout(dir: &Path) -> Result<Layout, String> {
    let text = std::fs::read_to_string(dir.join("widgetui").join("resourcepanel.json")).map_err(|e| e.to_string())?;
    let v: Value = serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|e| e.to_string())?;
    let bg = &v["Collection"]["Widgets"][0]["Widget"];
    let kids = bg["ChildWidgets"].as_array().ok_or("no widgets in resourcepanel.json")?;
    // Icons: centred on (xorigin, yorigin)
    let mut icons: Vec<(String, Rect, &Value)> = Vec::new();
    for k in kids {
        let w = &k["Widget"];
        let name = w["Name"].as_str().unwrap_or("");
        if RESOURCES.contains(&name) {
            let vp = &w["ViewPort"];
            let (iw, ih) = (num(vp, "width"), num(vp, "height"));
            icons.push((name.to_string(), Rect { x: num(vp, "xorigin") - iw / 2.0, y: num(vp, "yorigin") - ih / 2.0, w: iw, h: ih }, w));
        }
    }
    let wood = icons.iter().find(|i| i.0 == "Wood").ok_or("no wood icon in the layout")?.1;
    let food = icons.iter().find(|i| i.0 == "Food").ok_or("no food icon in the layout")?.1;
    let rel = |r: Rect| Rect { x: r.x - wood.x, y: r.y - wood.y, ..r };
    let mut boxes = Vec::new();
    // The villagers working each resource: a label inside its icon
    for (name, r, w) in &icons {
        for k in w["ChildWidgets"].as_array().into_iter().flatten() {
            let kv = &k["Widget"]["ViewPort"];
            if k["Widget"]["Type"] == "Label" {
                // the whole icon's width: the letter is above, out of the way
                let b = Rect { x: r.x + 2.0, y: r.y + num(kv, "yorigin"), w: r.w - 4.0, h: num(kv, "height") };
                boxes.push((format!("{}Workers", name), rel(b)));
            }
        }
    }
    // The amounts: labels centred vertically on yorigin, stopped at the next icon
    // (where that resource's villager count is)
    for k in kids {
        let w = &k["Widget"];
        let name = w["Name"].as_str().unwrap_or("");
        if w["Type"] == "Label" && (name.ends_with("Storage") || name == "PopulationCount") {
            let vp = &w["ViewPort"];
            let (x, h) = (num(vp, "xorigin"), num(vp, "height"));
            let mut width = num(vp, "width");
            if let Some(next) = icons.iter().map(|i| i.1.x).filter(|ix| *ix > x).fold(None, |m: Option<f64>, ix| Some(m.map_or(ix, |m| m.min(ix)))) {
                width = width.min(next - x - 2.0);
            }
            // A little room on the left: finding the bar can be a pixel or two off,
            // and a first "8" with its left edge cut reads as a "3"
            boxes.push((name.to_string(), rel(Rect { x: x - 6.0, y: num(vp, "yorigin") - h / 2.0, w: width + 6.0, h })));
        }
    }
    Ok(Layout { icon_w: wood.w, icon_h: wood.h, spacing: food.x - wood.x, boxes })
}

/// The Mac that installed the mod (game-mod/serve.py), if it left its address.
pub fn dev_server() -> Option<String> {
    let dir = mod_dir()?;
    let s = std::fs::read_to_string(dir.join("overlay-dev-server.txt")).ok()?;
    let s = s.trim().to_string();
    (!s.is_empty()).then_some(s)
}

// ---- pixels ----

fn px(img: &RgbaImage, x: i64, y: i64) -> [u8; 4] {
    if x < 0 || y < 0 || x >= img.width() as i64 || y >= img.height() as i64 {
        return [0, 0, 0, 255];
    }
    img.get_pixel(x as u32, y as u32).0
}

fn is_black(p: [u8; 4]) -> bool {
    p[0] < 24 && p[1] < 24 && p[2] < 24
}

fn is_letter_grey(p: [u8; 4]) -> bool {
    let (mx, mn) = (p[0].max(p[1]).max(p[2]), p[0].min(p[1]).min(p[2]));
    (105..=195).contains(&mx) && mx - mn <= 14
}

/// The white of the numbers (the letters are grey, the background black)
fn is_ink(p: [u8; 4]) -> bool {
    p[0].min(p[1]).min(p[2]) > 175
}

// ---- calibration: the grey letters on the black bar ----

#[derive(Clone, Copy, Debug)]
struct Blob {
    x0: i64,
    y0: i64,
    x1: i64,
    y1: i64,
    n: usize,
}

fn calibrate(img: &RgbaImage, layout: &Layout) -> Option<Calib> {
    let (w, h) = (img.width() as i64, img.height() as i64);
    let mut seen = vec![false; (w * h) as usize];
    let mut blobs: Vec<Blob> = Vec::new();
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let i = (y * w + x) as usize;
            if seen[i] || !is_letter_grey(px(img, x, y)) {
                continue;
            }
            // Letters sit on pure black: only start where black is right next to it
            if !(is_black(px(img, x - 1, y)) || is_black(px(img, x, y - 1)) || is_black(px(img, x - 2, y))) {
                continue;
            }
            let mut stack = vec![(x, y)];
            seen[i] = true;
            let mut b = Blob { x0: x, y0: y, x1: x, y1: y, n: 0 };
            while let Some((cx, cy)) = stack.pop() {
                b.n += 1;
                b.x0 = b.x0.min(cx);
                b.x1 = b.x1.max(cx);
                b.y0 = b.y0.min(cy);
                b.y1 = b.y1.max(cy);
                if b.n > 5000 {
                    break;
                }
                for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                    let (nx, ny) = (cx + dx, cy + dy);
                    if nx < 0 || ny < 0 || nx >= w || ny >= h {
                        continue;
                    }
                    let j = (ny * w + nx) as usize;
                    if !seen[j] && is_letter_grey(px(img, nx, ny)) {
                        seen[j] = true;
                        stack.push((nx, ny));
                    }
                }
            }
            let bh = b.y1 - b.y0 + 1;
            if (5..=80).contains(&bh) && b.n >= 12 && b.n < 5000 {
                blobs.push(b);
            }
        }
    }
    // The letters: blobs of the same height, top-aligned, evenly spaced in a row.
    // The first of the best such row is the W.
    let mut best: Option<(usize, Calib)> = None;
    for (i, a) in blobs.iter().enumerate() {
        let ah = a.y1 - a.y0 + 1;
        let mut row: Vec<&Blob> = blobs
            .iter()
            .filter(|b| (b.y0 - a.y0).abs() <= 2 && ((b.y1 - b.y0 + 1) - ah).abs() <= 2 && b.x0 >= a.x0)
            .collect();
        row.sort_by_key(|b| b.x0);
        row.dedup_by_key(|b| b.x0);
        if row.len() < 4 || row[0].x0 != a.x0 {
            continue;
        }
        let gap = (row[1].x0 - row[0].x0) as f64;
        if gap <= 0.0 {
            continue;
        }
        let even = row.windows(2).take(4).filter(|p| (((p[1].x0 - p[0].x0) as f64) - gap).abs() <= gap * 0.08 + 2.0).count();
        if even < 3 {
            continue;
        }
        let scale = gap / layout.spacing;
        // The mod draws each letter with its ink at 8% of the icon from its corner
        let c = Calib { x: a.x0 as f64 - 0.08 * layout.icon_w * scale, y: a.y0 as f64 - 0.08 * layout.icon_h * scale, scale };
        if best.is_none_or(|(n, _)| even > n) {
            best = Some((even, c));
        }
        let _ = i;
    }
    best.map(|b| b.1)
}

// ---- reading glyphs ----

struct Template {
    ch: char,
    norm: Vec<f32>,
    aspect: f32,
}

const NW: usize = 12;
const NH: usize = 18;

fn templates() -> &'static Vec<Template> {
    static T: std::sync::OnceLock<Vec<Template>> = std::sync::OnceLock::new();
    T.get_or_init(|| {
        let v: Value = serde_json::from_str(include_str!("hud_glyphs.json")).expect("hud_glyphs.json");
        let mut out = Vec::new();
        for (ch, g) in v["glyphs"].as_object().unwrap() {
            let (w, h) = (g["w"].as_u64().unwrap() as usize, g["h"].as_u64().unwrap() as usize);
            let bits: Vec<bool> = g["bits"].as_str().unwrap().bytes().map(|b| b == b'1').collect();
            let mask = |x: usize, y: usize| bits[y * w + x];
            out.push(Template { ch: ch.chars().next().unwrap(), norm: normalize(w, h, &mask), aspect: w as f32 / h as f32 });
        }
        out
    })
}

/// A glyph's ink scaled into NW x NH (area average), minus its mean.
fn normalize(w: usize, h: usize, ink: &dyn Fn(usize, usize) -> bool) -> Vec<f32> {
    let mut out = vec![0f32; NW * NH];
    for oy in 0..NH {
        for ox in 0..NW {
            let (x0, x1) = (ox * w / NW, ((ox + 1) * w).div_ceil(NW).max(ox * w / NW + 1).min(w));
            let (y0, y1) = (oy * h / NH, ((oy + 1) * h).div_ceil(NH).max(oy * h / NH + 1).min(h));
            let mut s = 0u32;
            let mut n = 0u32;
            for y in y0..y1 {
                for x in x0..x1 {
                    s += ink(x, y) as u32;
                    n += 1;
                }
            }
            out[oy * NW + ox] = s as f32 / n.max(1) as f32;
        }
    }
    let mean = out.iter().sum::<f32>() / out.len() as f32;
    out.iter_mut().for_each(|v| *v -= mean);
    out
}

fn classify(norm: &[f32], aspect: f32) -> char {
    let mut best = ('?', f32::MIN);
    for t in templates().iter().filter(|t| t.ch != ':') {
        let (mut dot, mut na, mut nb) = (0f32, 0f32, 0f32);
        for (a, b) in norm.iter().zip(&t.norm) {
            dot += a * b;
            na += a * a;
            nb += b * b;
        }
        let score = dot / ((na * nb).sqrt() + 1e-6) - 0.5 * (aspect - t.aspect).abs();
        if score > best.1 {
            best = (t.ch, score);
        }
    }
    best.0
}

/// The text in a box on the screen (pixels): digits, "/" and ":".
/// max_glyphs: stop after this many (the clock is followed by "(Normal - 1.7)").
fn read_text(img: &RgbaImage, bx: f64, by: f64, bw: f64, bh: f64, max_glyphs: usize) -> String {
    let (x0, y0) = (bx.round() as i64, by.round() as i64);
    let (w, h) = (bw.floor().max(1.0) as i64, bh.ceil().max(1.0) as i64 + 1);
    let ink = |x: i64, y: i64| is_ink(px(img, x0 + x, y0 + y));
    let cols: Vec<bool> = (0..w).map(|x| (0..h).any(|y| ink(x, y))).collect();
    let mut rows_with_ink = (0..h).filter(|&y| (0..w).any(|x| ink(x, y)));
    let Some(top) = rows_with_ink.next() else { return String::new() };
    let bottom = rows_with_ink.next_back().unwrap_or(top);
    let full_h = (bottom - top + 1) as f64;
    let mut out = String::new();
    let mut x = 0;
    while x < w {
        if !cols[x as usize] {
            x += 1;
            continue;
        }
        let a = x;
        while x < w && cols[x as usize] {
            x += 1;
        }
        let b = x;
        let ys: Vec<i64> = (0..h).filter(|&y| (a..b).any(|xx| ink(xx, y))).collect();
        let (gy0, gy1) = (ys[0], *ys.last().unwrap());
        let gh = (gy1 - gy0 + 1) as f64;
        // ":" is two dots with a gap between them; no digit has one
        let gap = ys.windows(2).any(|p| p[1] - p[0] > 1);
        if gap && gh < full_h * 0.9 {
            out.push(':');
        } else if gh < full_h * 0.4 {
            // a stray dot (a "." or a speck): not part of a number
        } else {
            let gw = (b - a) as usize;
            let norm = normalize(gw, gh as usize, &|xx, yy| ink(a + xx as i64, gy0 + yy as i64));
            out.push(classify(&norm, gw as f32 / gh as f32));
        }
        if out.len() >= max_glyphs {
            break;
        }
    }
    out
}

// ---- the clock: white "hh:mm:ss" in the black box the mod puts behind it ----

fn looks_like_clock(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 8 && b[2] == b':' && b[5] == b':' && b.iter().enumerate().all(|(i, c)| i == 2 || i == 5 || c.is_ascii_digit())
}

fn find_clock(img: &RgbaImage, scale: f64) -> Option<(f64, f64, f64, f64)> {
    let (w, h) = (img.width() as i64, img.height() as i64);
    let box_w = 640.0 * scale;
    let box_h = 60.0 * scale; // game-mod/build.py: timer_with_black_box
    // Rows in the top 40% and bottom 40% with a run of pure black about the box's
    // width. Every row: the margins around the text can be a few pixels thin.
    let rows = (0..h * 2 / 5).chain(h * 3 / 5..h);
    for y in rows {
        let mut x = 0;
        while x < w {
            if !is_black(px(img, x, y)) {
                x += 1;
                continue;
            }
            let a = x;
            while x < w && is_black(px(img, x, y)) {
                x += 1;
            }
            let run = (x - a) as f64;
            if run < box_w * 0.6 || run > box_w * 1.4 {
                continue;
            }
            // The box's top and bottom: along its left margin, which stays black
            let col = a + (4.0 * scale).max(2.0) as i64;
            let (mut top, mut bottom) = (y, y);
            while top > 0 && is_black(px(img, col, top - 1)) {
                top -= 1;
            }
            while bottom < h - 1 && is_black(px(img, col, bottom + 1)) {
                bottom += 1;
            }
            let bh = (bottom - top + 1) as f64;
            if bh < box_h * 0.6 || bh > box_h * 1.6 {
                continue;
            }
            let found = (a as f64 + 2.0, top as f64, run * 0.6, bh);
            if looks_like_clock(&read_text(img, found.0, found.1, found.2, found.3, 8)) {
                return Some(found);
            }
        }
    }
    None
}

// ---- one reading ----

fn capture() -> Result<RgbaImage, String> {
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
        let m = monitors
            .iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .or(monitors.first())
            .ok_or("no screen")?;
        let img = m.capture_image().map_err(|e| e.to_string())?;
        // xcap's image type is its own image crate's; copy the raw RGBA over
        let (w, h) = (img.width(), img.height());
        RgbaImage::from_raw(w, h, img.into_raw()).ok_or_else(|| "bad capture".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("reading the screen is only on Windows and macOS".into())
    }
}

/// Reads the bar from `img`, calibrating if needed. Returns the values by name.
pub fn read_image(img: &RgbaImage, layout: &Layout) -> Result<(Value, Calib), String> {
    let mut state = STATE.lock().unwrap();
    for attempt in 0..2 {
        if state.calib.is_none() || attempt == 1 {
            state.calib = calibrate(img, layout);
            state.clock = None;
        }
        let Some(c) = state.calib else {
            return Err("Didn't find the resource bar on the screen: is the game on this screen, with the AoE2 Overlay Mod on?".into());
        };
        let mut values = serde_json::Map::new();
        let mut empty = 0;
        for (name, r) in &layout.boxes {
            let t = read_text(img, c.x + r.x * c.scale, c.y + r.y * c.scale, r.w * c.scale, r.h * c.scale, 12);
            if t.is_empty() {
                empty += 1;
            }
            values.insert(name.clone(), json!(t));
        }
        // All empty: the bar moved or the scale changed; calibrate again once
        if empty == layout.boxes.len() && attempt == 0 {
            continue;
        }
        if state.clock.is_none() {
            state.clock = find_clock(img, c.scale);
        }
        if let Some((x, y, w, h)) = state.clock {
            let t = read_text(img, x, y, w, h, 8);
            if looks_like_clock(&t) {
                values.insert("Clock".into(), json!(t));
            } else {
                state.clock = None;
            }
        }
        return Ok((Value::Object(values), c));
    }
    Err("Lost the resource bar".into())
}

/// The bar's area (and the clock's) with the boxes drawn: what the reader looks at.
fn debug_png(img: &RgbaImage, layout: &Layout, c: Calib) -> Option<String> {
    let mut x1 = 0f64;
    let mut y1 = 0f64;
    for (_, r) in &layout.boxes {
        x1 = x1.max(r.x + r.w);
        y1 = y1.max(r.y + r.h);
    }
    let (sx, sy) = ((c.x - 10.0).max(0.0) as u32, (c.y - 10.0).max(0.0) as u32);
    let sw = ((x1 * c.scale + 20.0) as u32).min(img.width().saturating_sub(sx));
    let sh = ((y1 * c.scale + 20.0) as u32).min(img.height().saturating_sub(sy));
    if sw == 0 || sh == 0 {
        return None;
    }
    let mut crop = image::imageops::crop_imm(img, sx, sy, sw, sh).to_image();
    for (_, r) in &layout.boxes {
        let (bx, by) = (c.x + r.x * c.scale - sx as f64, c.y + r.y * c.scale - sy as f64);
        let (bw, bh) = (r.w * c.scale, r.h * c.scale);
        for t in 0..=(bw as i64) {
            for yy in [by as i64, (by + bh) as i64] {
                if let Some(p) = crop.get_pixel_mut_checked((bx as i64 + t) as u32, yy as u32) {
                    p.0 = [0, 200, 255, 255];
                }
            }
        }
        for t in 0..=(bh as i64) {
            for xx in [bx as i64, (bx + bw) as i64] {
                if let Some(p) = crop.get_pixel_mut_checked(xx as u32, (by as i64 + t) as u32) {
                    p.0 = [0, 200, 255, 255];
                }
            }
        }
    }
    let mut buf = std::io::Cursor::new(Vec::new());
    crop.write_to(&mut buf, image::ImageFormat::Png).ok()?;
    Some(base64(&buf.into_inner()))
}

fn base64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::with_capacity(data.len() * 4 / 3 + 4);
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        for i in 0..4 {
            if i <= c.len() {
                s.push(T[(n >> (18 - 6 * i) & 63) as usize] as char);
            } else {
                s.push('=');
            }
        }
    }
    s
}

/// One reading of the screen, for the page: values, timings, and (if asked) what
/// the reader saw.
pub fn read_screen(with_image: bool) -> Value {
    let t0 = Instant::now();
    let Some(dir) = mod_dir() else {
        return json!({ "ok": false, "error": "The AoE2 Overlay Mod isn't installed (in the game's mods/local)." });
    };
    let layout = match load_layout(&dir) {
        Ok(l) => l,
        Err(e) => return json!({ "ok": false, "error": format!("Couldn't read the mod's layout: {e}") }),
    };
    let img = match capture() {
        Ok(i) => i,
        Err(e) => return json!({ "ok": false, "error": format!("Couldn't capture the screen: {e}") }),
    };
    let t_capture = t0.elapsed().as_secs_f64() * 1000.0;
    let t1 = Instant::now();
    match read_image(&img, &layout) {
        Ok((values, c)) => {
            let t_read = t1.elapsed().as_secs_f64() * 1000.0;
            let mut out = json!({
                "ok": true,
                "values": values,
                "captureMs": t_capture,
                "readMs": t_read,
                "screen": format!("{}x{}", img.width(), img.height()),
                "scale": c.scale,
            });
            if with_image {
                out["image"] = json!(debug_png(&img, &layout, c));
            }
            out
        }
        Err(e) => json!({ "ok": false, "error": e, "captureMs": t_capture, "screen": format!("{}x{}", img.width(), img.height()) }),
    }
}

/// Sends the whole screen and what was read to the Mac that installed the mod, so
/// we can see what the reader got wrong. Returns where it went.
pub fn send_snapshot() -> Result<String, String> {
    let server = dev_server().ok_or("No Mac to send it to (the mod wasn't installed from one).")?;
    let img = capture()?;
    let reading = match (mod_dir().map(|d| load_layout(&d)), Some(&img)) {
        (Some(Ok(l)), Some(i)) => match read_image(i, &l) {
            Ok((v, c)) => json!({ "values": v, "scale": c.scale, "x": c.x, "y": c.y }),
            Err(e) => json!({ "error": e }),
        },
        _ => json!({ "error": "no layout" }),
    };
    let mut buf = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buf, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    let body = json!({ "reading": reading, "png": base64(&buf.into_inner()) }).to_string();
    post(&format!("{server}/capture"), &body)?;
    Ok(server)
}

/// A minimal HTTP POST (the Mac's server is plain http on the home network).
fn post(url: &str, body: &str) -> Result<(), String> {
    use std::io::{Read, Write};
    let rest = url.strip_prefix("http://").ok_or("only http:// addresses")?;
    let (host, path) = rest.split_once('/').map(|(h, p)| (h, format!("/{p}"))).unwrap_or((rest, "/".into()));
    let mut s = std::net::TcpStream::connect(host).map_err(|e| e.to_string())?;
    s.set_read_timeout(Some(std::time::Duration::from_secs(10))).ok();
    let req = format!(
        "POST {path} HTTP/1.1\r\nHost: {host}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    s.write_all(req.as_bytes()).map_err(|e| e.to_string())?;
    let mut resp = String::new();
    s.read_to_string(&mut resp).ok();
    if resp.starts_with("HTTP/1.0 200") || resp.starts_with("HTTP/1.1 200") {
        Ok(())
    } else {
        Err(resp.lines().next().unwrap_or("no answer").to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Frames drawn like the game's (experiments/hud-numbers/make_test_frames.py)
    #[test]
    fn reads_test_frames() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../experiments/hud-numbers/frames");
        if !dir.exists() {
            eprintln!("no test frames: python3 -I experiments/hud-numbers/make_test_frames.py <built mod>");
            return;
        }
        let layout = load_layout(&dir.join("mod")).expect("layout");
        let truth: Value = serde_json::from_str(&std::fs::read_to_string(dir.join("truth.json")).unwrap()).unwrap();
        let (mut ok, mut total) = (0, 0);
        let mut wrong = Vec::new();
        for (file, want) in truth.as_object().unwrap() {
            STATE.lock().unwrap().calib = None;
            STATE.lock().unwrap().clock = None;
            let img = image::open(dir.join(file)).unwrap().to_rgba8();
            let t0 = Instant::now();
            let (got, _) = read_image(&img, &layout).unwrap_or_else(|e| panic!("{file}: {e}"));
            let first = t0.elapsed().as_secs_f64() * 1000.0;
            let t1 = Instant::now();
            let _ = read_image(&img, &layout);
            println!("{file}: first read (finds the bar and the clock) {first:.1} ms, then {:.2} ms", t1.elapsed().as_secs_f64() * 1000.0);
            for (k, v) in want.as_object().unwrap() {
                total += 1;
                if got.get(k) == Some(v) {
                    ok += 1;
                } else if wrong.len() < 10 {
                    wrong.push(format!("{file} {k}: {v} -> {:?}", got.get(k)));
                }
            }
        }
        println!("{ok}/{total} right");
        assert!(wrong.is_empty(), "{ok}/{total} right; wrong: {wrong:#?}");
    }
}
