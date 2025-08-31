# cv_heuristics_ocr_debug_timed.py
import sys, os, json, time, cv2, numpy as np
from pathlib import Path
from PIL import Image
import tesserocr
import base64
from io import BytesIO

# ---------- Tunables ----------
IMG_PATH = sys.argv[1] if len(sys.argv) > 1 else "test-screenshot.png"
OUT_DIR = Path("out")
OUT_DIR.mkdir(exist_ok=True)


# HUD cropping parameters - crop to the top area where resources are displayed
CROP_TOP_FRAC = 0.15  # Reduced from 0.30 to focus on the resource area
CROP_WIDTH = 1750  # Target width for HUD area
CROP_HEIGHT = 276  # Target height for HUD area
INVERT = True
KERNEL = (1, 3)  # unused (closing off)
CLOSE_ITERS = 1  # unused (closing off)
MIN_H_PX = 14
MIN_AREA = 100
AR_MIN, AR_MAX = 0.35, 15
FILL_MIN = 0.18
MERGE_GAP = 12
PAD = 2
ROI_STRIP_H = 64
TARGET_H = 28
BATCH_SIZE = None
RUNS = 10  # how many timed runs
SAVE_DEBUG_FIRST_RUN = True
CPU_THREADS = 1
# ------------------------------

# (Optional) sane thread env; adjust if you like
os.environ["OMP_NUM_THREADS"] = str(CPU_THREADS)
os.environ["MKL_NUM_THREADS"] = str(CPU_THREADS)
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")


def save(name, img, *, enable=True):
    if enable:
        cv2.imwrite(str(OUT_DIR / name), img)


def to_bgr(im):
    return cv2.cvtColor(im, cv2.COLOR_GRAY2BGR) if len(im.shape) == 2 else im


def merge_boxes_horiz(boxes, gap=MERGE_GAP, v_overlap=0.6):
    if not boxes:
        return []
    boxes = sorted(boxes, key=lambda b: (b[1], b[0]))
    merged = [boxes[0]]
    for x, y, w, h in boxes[1:]:
        X, Y, W, H = merged[-1]
        if abs((Y + H / 2) - (y + h / 2)) < max(H, h) * v_overlap and x <= X + W + gap:
            nx, ny = min(X, x), min(Y, y)
            nW = max(X + W, x + w) - nx
            nH = max(Y + H, y + h) - ny
            merged[-1] = [nx, ny, nW, nH]
        else:
            merged.append([x, y, w, h])
    return merged


def group_into_rows(boxes, row_thresh_px):
    if not boxes:
        return []
    by_y = sorted(boxes, key=lambda b: b[1] + b[3] / 2.0)
    rows, cur = [], [by_y[0]]
    cur_yc = by_y[0][1] + by_y[0][3] / 2.0
    for b in by_y[1:]:
        yc = b[1] + b[3] / 2.0
        if abs(yc - cur_yc) <= row_thresh_px:
            cur.append(b)
            cur_yc = (cur_yc * (len(cur) - 1) + yc) / len(cur)
        else:
            rows.append(sorted(cur, key=lambda r: r[0]))
            cur = [b]
            cur_yc = yc
    rows.append(sorted(cur, key=lambda r: r[0]))
    return rows


def vertical_overlap_pixels(a, b):
    top = max(a[1], b[1])
    bot = min(a[1] + a[3], b[1] + b[3])
    return max(0, bot - top)


def merge_row_boxes(
    row, gap_px, v_overlap_ratio=0.6, max_wh_ratio=20, max_group_width_px=None
):
    merged = []
    cur = list(row[0])
    for b in row[1:]:
        gap = b[0] - (cur[0] + cur[2])
        v_ov = vertical_overlap_pixels(cur, b)
        min_h = min(cur[3], b[3])
        can_merge = (gap <= gap_px) and (v_ov >= v_overlap_ratio * min_h)
        if can_merge:
            x1 = min(cur[0], b[0])
            y1 = min(cur[1], b[1])
            x2 = max(cur[0] + cur[2], b[0] + b[2])
            y2 = max(cur[1] + cur[3], b[1] + b[3])
            candidate = [x1, y1, x2 - x1, y2 - y1]
            wh_ratio = candidate[2] / max(1, candidate[3])
            too_wide = (wh_ratio > max_wh_ratio) or (
                max_group_width_px and candidate[2] > max_group_width_px
            )
            if too_wide:
                merged.append(cur)
                cur = list(b)
            else:
                cur = candidate
        else:
            merged.append(cur)
            cur = list(b)
    merged.append(cur)
    return merged


def pad_box(x, y, w, h, pad=PAD, W=None, H=None):
    x2, y2 = max(0, x - pad), max(0, y - pad)
    w2, h2 = w + 2 * pad, h + 2 * pad
    if W is not None and H is not None:
        w2 = min(w2, W - x2)
        h2 = min(h2, H - y2)
    return [int(x2), int(y2), int(w2), int(h2)]


def load_image_from_base64(base64_string):
    """Load image from base64 string"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith("data:image"):
            base64_string = base64_string.split(",")[1]

        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)

        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image from base64")

        return img
    except Exception as e:
        raise ValueError(f"Error loading image from base64: {str(e)}")


def load_image_from_path(image_path):
    """Load image from file path"""
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Image not found: {image_path}")
    return img


def ocr_rois_with_tesseract(binary_img, boxes, api):
    out = []
    for i, (x, y, w, h) in enumerate(boxes):
        if w <= 0 or h <= 0:
            continue
        # recognizer likes BLACK text on WHITE; you already have white text in `binary`
        # so invert to black-on-white for Tesseract
        roi = 255 - binary_img[y : y + h, x : x + w]
        # upscale a bit for thin fonts (cheap)
        scale = 32 / max(1, roi.shape[0])
        if scale < 1.2:
            scale = 1.2
        roi = cv2.resize(roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        pil = Image.fromarray(roi)
        api.SetImage(pil)
        txt = api.GetUTF8Text() or ""
        conf = api.MeanTextConf() / 100.0
        out.append({"index": i, "text": txt.strip(), "confidence": conf})
    return out


def process_once(bgr, api, save_debug=False):
    t0 = time.perf_counter()

    # 1) HUD crop - crop to the specified dimensions for resource detection
    H, W = bgr.shape[:2]

    # Calculate crop dimensions based on target size and image size
    crop_width = min(CROP_WIDTH, W)
    crop_height = min(CROP_HEIGHT, H)

    # Crop from top-left corner
    hud = bgr[:crop_height, :crop_width]
    hud_h = crop_height

    # 2) Gray (+ optional invert)
    gray = cv2.cvtColor(hud, cv2.COLOR_BGR2GRAY)
    proc = cv2.bitwise_not(gray) if INVERT else gray

    # 3) Binary (Otsu)
    binary = cv2.threshold(proc, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    # 4) Ensure text is WHITE for contours
    binary = cv2.threshold(binary, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

    t_pre = time.perf_counter()

    # 5) Contours
    cnts, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 6) Filter
    cands = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if h < MIN_H_PX or w == 0:
            continue
        ar = w / h
        if ar < AR_MIN or ar > AR_MAX:
            continue
        if (w * h) < MIN_AREA:
            continue
        roi = binary[y : y + h, x : x + w]
        fill = float(cv2.countNonZero(roi)) / (w * h)
        if fill < FILL_MIN:
            continue
        cands.append([x, y, w, h])

    # 7) Merge into groups (rows first)
    if not cands:
        merged = []
    else:
        heights = [h for _, _, _, h in cands]
        h_med = int(np.median(heights))
        GAP_PX = max(6, int(0.6 * h_med))
        ROW_THRESH = max(6, int(0.5 * h_med))
        MAX_GROUP_W = int(0.7 * hud.shape[1])
        rows = group_into_rows(cands, row_thresh_px=ROW_THRESH)
        merged = []
        for row in rows:
            merged += merge_row_boxes(
                row,
                gap_px=GAP_PX,
                v_overlap_ratio=0.6,
                max_wh_ratio=20,
                max_group_width_px=MAX_GROUP_W,
            )

    # 8) Pad
    final_boxes = [
        pad_box(x, y, w, h, pad=PAD, W=bgr.shape[1], H=hud_h) for (x, y, w, h) in merged
    ]

    t_detect = time.perf_counter()

    # 9) OCR with Tesseract
    recog = ocr_rois_with_tesseract(binary, final_boxes, api)

    t_pred = time.perf_counter()

    if save_debug:
        save("02_hud_crop.png", hud, enable=True)
        save("03_gray.png", gray, enable=True)
        save(
            "04_inverted.png" if INVERT else "04_gray_passthrough.png",
            proc,
            enable=True,
        )
        save("05_binary.png", binary, enable=True)
        hud_all = hud.copy()
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(hud_all, (x, y), (x + w, y + h), (0, 255, 0), 1)
        save("06_contours_all.png", hud_all, enable=True)
        hud_cand = hud.copy()
        for x, y, w, h in cands:
            cv2.rectangle(hud_cand, (x, y), (x + w, y + h), (255, 0, 0), 1)
        save("07_candidates_filtered.png", hud_cand, enable=True)
        hud_merged = hud.copy()
        for x, y, w, h in merged:
            cv2.rectangle(hud_merged, (x, y), (x + w, y + h), (0, 0, 255), 2)
        save("08_candidates_merged.png", hud_merged, enable=True)
        # ROI strip
        tiles = []
        for i, (x, y, w, h) in enumerate(final_boxes):
            roi = binary[y : y + h, x : x + w]
            if roi.size == 0:
                continue
            scale = ROI_STRIP_H / max(1, roi.shape[0])
            tile = cv2.resize(
                roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR
            )
            tile = to_bgr(tile)
            cv2.putText(
                tile,
                f"#{i}",
                (4, ROI_STRIP_H - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )
            tiles.append(tile)
        if tiles:
            strip = tiles[0]
            for t in tiles[1:]:
                strip = cv2.hconcat([strip, t])
            save("09_roi_strip.png", strip, enable=True)
        annot = bgr.copy()
        for i, (x, y, w, h) in enumerate(final_boxes):
            cv2.rectangle(annot, (x, y), (x + w, y + h), (0, 255, 255), 2)
        # overlay recognized text (only confident)
        for item in recog:
            if item["confidence"] >= 0.5:
                x, y, w, h = final_boxes[item["index"]]
                cv2.putText(
                    annot,
                    item["text"],
                    (x, max(0, y - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )
        save("10_full_annotated.png", annot, enable=True)

    t1 = time.perf_counter()
    return {
        "n_candidates": len(cands),
        "n_groups": len(final_boxes),
        "n_rois_for_rec": len(recog),
        "timing_sec": {
            "pre_binary": round(t_pre - t0, 4),
            "detect_merge": round(t_detect - t_pre, 4),
            "predict": round(t_pred - t_detect, 4),
            "total": round(t1 - t0, 4),
        },
        "results": recog,
    }


def process_image(image_input, save_debug=False, runs=1):
    """
    Process an image with OCR

    Args:
        image_input: Either a file path (string) or base64 image data (string)
        save_debug: Whether to save debug images
        runs: Number of runs to perform (for timing)

    Returns:
        Dictionary with OCR results
    """
    # Load image
    if isinstance(image_input, str):
        if image_input.startswith("data:image") or len(image_input) > 1000:
            # Assume it's base64 data
            bgr_full = load_image_from_base64(image_input)
        else:
            # Assume it's a file path
            bgr_full = load_image_from_path(image_input)
    else:
        raise ValueError("image_input must be a string (file path or base64 data)")

    H, W = bgr_full.shape[:2]
    save("01_input.png", bgr_full, enable=save_debug)

    # Initialize OCR API
    t_init0 = time.perf_counter()
    api = tesserocr.PyTessBaseAPI(
        lang="eng",
        oem=tesserocr.OEM.LSTM_ONLY,
        psm=tesserocr.PSM.SINGLE_LINE,
        path="/opt/homebrew/share/tessdata/",
    )
    api.SetVariable(
        "tessedit_char_whitelist",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/-.()*%+ ",
    )
    t_init1 = time.perf_counter()

    # Warm up
    api.SetImage(Image.fromarray(np.zeros((32, 128), dtype=np.uint8)))
    _ = api.GetUTF8Text()
    t_init2 = time.perf_counter()

    # Process the image
    all_runs = []
    for i in range(runs):
        debug = save_debug and (i == 0)
        info = process_once(bgr_full, api, save_debug=debug)
        all_runs.append(info)

    # Clean up
    api.End()

    # Return results in the format expected by the OCR service
    if runs == 1:
        # Single run - return the result directly
        result = all_runs[0]
        detections = []
        for item in result["results"]:
            detections.append(
                {
                    "text": item["text"],
                    "confidence": item["confidence"],
                    "bounding_box": None,  # Tesseract doesn't provide bounding boxes in this format
                }
            )

        return {
            "success": True,
            "text": " ".join([item["text"] for item in result["results"]]),
            "confidence": (
                sum([item["confidence"] for item in result["results"]])
                / len(result["results"])
                if result["results"]
                else 0.0
            ),
            "detections": detections,
            "timing": result["timing_sec"],
        }
    else:
        # Multiple runs - return timing summary
        totals = [r["timing_sec"]["total"] for r in all_runs]
        return {
            "success": True,
            "runs": runs,
            "timing_summary": {
                "avg": round(sum(totals) / len(totals), 4),
                "min": round(min(totals), 4),
                "max": round(max(totals), 4),
            },
            "last_result": all_runs[-1],
        }


def main():
    """Main function that handles different input modes"""
    if len(sys.argv) > 1:
        # Command line mode - use file path
        image_path = sys.argv[1]
        print(f"Processing image from file: {image_path}")
        result = process_image(image_path, save_debug=SAVE_DEBUG_FIRST_RUN, runs=RUNS)
        print(json.dumps(result, ensure_ascii=False))
    else:
        # Stdin mode - expect base64 image data
        try:
            print("Reading image data from stdin...", file=sys.stderr)
            input_data = sys.stdin.read()

            if not input_data:
                raise ValueError("No input data provided")

            # Try to parse as JSON first
            try:
                input_json = json.loads(input_data)
                base64_image = input_json.get("image")
                if not base64_image:
                    raise ValueError("No image data in JSON input")
            except json.JSONDecodeError:
                # Assume it's raw base64 data
                base64_image = input_data.strip()

            print(
                f"Processing base64 image data ({len(base64_image)} chars)",
                file=sys.stderr,
            )
            result = process_image(base64_image, save_debug=False, runs=1)
            print(json.dumps(result, ensure_ascii=False))

        except Exception as e:
            error_result = {"success": False, "error": str(e)}
            print(json.dumps(error_result, ensure_ascii=False))
            sys.exit(1)


if __name__ == "__main__":
    main()
