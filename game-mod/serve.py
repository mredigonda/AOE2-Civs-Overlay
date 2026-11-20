"""Serves the game mod to a Windows PC on the same network.

    python3 -I game-mod/serve.py            # then open http://<this Mac's IP>:8765 on the PC

The page has the installer (windows/install-aoe2-overlay-mod.bat, with this server's
address filled in). When it runs, it POSTs the PC's mod list and resource bar layout
to /build and gets back the mod built for that setup, as a zip; at the end it POSTs
what happened to /log. Both are saved in game-mod/reports/ (not in git), so we can see
how it went on the PC.
"""
import datetime
import html
import io
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402

PORT = 8765
BAT = os.path.join(HERE, "windows", "install-aoe2-overlay-mod.bat")
# The overlay's Windows test build (a GitHub Actions "Test build (Windows)" artifact)
OVERLAY_DIR = os.path.join(HERE, "dist-overlay")
REPORTS = os.path.join(HERE, "reports")


def lan_ip():
    for iface in ("en0", "en1"):
        try:
            ip = subprocess.run(["ipconfig", "getifaddr", iface], capture_output=True, text=True).stdout.strip()
            if ip:
                return ip
        except OSError:
            pass
    return socket.gethostbyname(socket.gethostname())


PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AoE2 Overlay Mod</title>
<style>
body {{ font: 16px/1.5 system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; background: #15130f; color: #eee8d8; }}
a.btn {{ display: inline-block; padding: 12px 20px; background: #ffd700; color: #111; border-radius: 8px; font-weight: 600; text-decoration: none; }}
code {{ background: #2a261e; padding: 1px 5px; border-radius: 4px; }}
li {{ margin: 6px 0; }} .muted {{ color: #a59f8f; font-size: 14px; }}
</style></head><body>
<h1>AoE2 Overlay Mod</h1>
<p>Arabia 1v1 minimap rings 6 tiles inside and outside the Town Center spawn ring, and a black resource bar with letters and big numbers.</p>
<p><a class="btn" href="/install-aoe2-overlay-mod.bat">Download the installer</a></p>
<ol>
<li>Close Age of Empires II.</li>
<li>Download the installer. If the browser warns about the file, choose <b>Keep</b> (Edge: <b>…</b> → <b>Keep</b> → <b>Keep anyway</b>).</li>
<li>Double-click it. If Windows says <b>"Windows protected your PC"</b>, click <b>More info</b> → <b>Run anyway</b>.</li>
<li>It finds your mods, builds the mod on the Mac for your setup, installs it and turns it on first in your mod list. Read what it says, then press a key to close it.</li>
<li>Start the game and play a 1v1 Arabia.</li>
</ol>
{overlay}
<p class="muted">To undo: in the game, Mods → Installed, turn off "AoE2 Overlay Mod". The installer also keeps your previous mod list as <code>mod-status.json.bak</code> next to <code>mod-status.json</code>.</p>
<p class="muted">Served from this Mac at {server}. Installs so far: {count}.</p>
</body></html>
"""


# The overlay for Windows, built on this Mac (game-mod/build-windows-overlay.sh): one
# self-contained .exe (the page is built into it; Windows 11 has the WebView it uses)
CROSS_BUILD = os.path.join(HERE, "..", "src-tauri", "target", "x86_64-pc-windows-msvc", "release", "aoe2-civs-overlay.exe")


def overlay_exe():
    return CROSS_BUILD if os.path.exists(CROSS_BUILD) else None


def report_dir(tag):
    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    safe = re.sub(r"[^A-Za-z0-9_-]", "", tag or "pc")[:40] or "pc"
    d = os.path.join(REPORTS, f"{stamp}_{safe}")
    os.makedirs(d, exist_ok=True)
    return d


def build_zip(panel_layout_text):
    users, game = build.find_game()
    ui = os.path.join(game, "widgetui")
    if panel_layout_text:
        layout = json.loads(panel_layout_text.lstrip("﻿"))
    else:
        layout = json.load(open(os.path.join(ui, "resourcepanel.json"), encoding="utf-8-sig"))
    tmp = tempfile.mkdtemp()
    try:
        out = os.path.join(tmp, build.MOD_TITLE)
        build.build(ui, layout, out)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(out):
                for f in files:
                    full = os.path.join(root, f)
                    z.write(full, os.path.relpath(full, out).replace(os.sep, "/"))
        return buf.getvalue()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def server_url(self):
        return "http://" + (self.headers.get("Host") or f"{lan_ip()}:{PORT}")

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            count = len(os.listdir(REPORTS)) if os.path.isdir(REPORTS) else 0
            exe = overlay_exe()
            overlay = (
                f'<h2>The overlay (test build)</h2><p><a class="btn" href="/overlay/{html.escape(os.path.basename(exe))}">Download the overlay</a></p>'
                f'<p class="muted">Built {datetime.datetime.fromtimestamp(os.path.getmtime(exe)).strftime("%Y-%m-%d %H:%M")}. '
                "The installer above installs or updates it too (and starts it), so you don't need this button.</p>"
                "<p>In its ⚙ turn on "
                "<b>Read the game's screen</b>. It shows what it reads and when; <b>Send to the Mac</b> sends the screen and the reading here.</p>"
                if exe
                else ""
            )
            page = PAGE.format(server=html.escape(self.server_url()), count=count, overlay=overlay)
            return self.send(200, page.encode(), "text/html; charset=utf-8")
        if self.path == "/install-aoe2-overlay-mod.bat":
            text = open(BAT, encoding="utf-8").read().replace("__SERVER__", self.server_url())
            body = text.replace("\r\n", "\n").replace("\n", "\r\n").encode("ascii", "replace")
            return self.send(200, body, "application/octet-stream", {"Content-Disposition": 'attachment; filename="install-aoe2-overlay-mod.bat"'})
        exe = overlay_exe()
        if exe and self.path in ("/overlay/latest.exe", "/overlay/" + os.path.basename(exe)):
            body = open(exe, "rb").read()
            return self.send(200, body, "application/octet-stream", {"Content-Disposition": f'attachment; filename="{os.path.basename(exe)}"'})
        self.send(404, b"not found", "text/plain")

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8-sig"))
        except ValueError:
            return self.send(400, b"not JSON", "text/plain")
        if self.path == "/build":
            report = data.get("report") or {}
            d = report_dir(report.get("computer"))
            json.dump(report, open(os.path.join(d, "report.json"), "w"), indent=2, ensure_ascii=False)
            if data.get("panelLayout"):
                open(os.path.join(d, "panel-layout.json"), "w", encoding="utf-8").write(data["panelLayout"])
            try:
                body = build_zip(data.get("panelLayout"))
            except Exception as e:  # tell the PC, and keep it
                open(os.path.join(d, "build-error.txt"), "w").write(repr(e))
                return self.send(500, f"Build failed on the Mac: {e}".encode(), "text/plain")
            print(f"built the mod for {report.get('computer')} ({report.get('layoutFrom')}) -> {os.path.relpath(d, HERE)}")
            return self.send(200, body, "application/zip")
        if self.path == "/capture":
            # The overlay's "Send to the Mac": the whole screen and what it read
            d = os.path.join(REPORTS, "captures", datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
            os.makedirs(d, exist_ok=True)
            import base64

            open(os.path.join(d, "screen.png"), "wb").write(base64.b64decode(data.get("png", "")))
            json.dump(data.get("reading"), open(os.path.join(d, "reading.json"), "w"), indent=2)
            print("capture from the overlay ->", os.path.relpath(d, HERE))
            return self.send(200, b"ok", "text/plain")
        if self.path == "/log":
            runs = sorted(os.listdir(REPORTS)) if os.path.isdir(REPORTS) else []
            d = os.path.join(REPORTS, runs[-1]) if runs else report_dir("pc")
            json.dump(data, open(os.path.join(d, "install-log.json"), "w"), indent=2, ensure_ascii=False)
            print("install", "OK" if data.get("ok") else "FAILED", "->", os.path.relpath(d, HERE))
            return self.send(200, b"ok", "text/plain")
        self.send(404, b"not found", "text/plain")

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    os.makedirs(REPORTS, exist_ok=True)
    print(f"Open on the Windows PC: http://{lan_ip()}:{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
