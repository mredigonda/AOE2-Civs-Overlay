// Language switch and the download button: finds the latest release's
// installer for the visitor's system through GitHub's API.
(function () {
    "use strict";

    const REPO = "mredigonda/AOE2-Civs-Overlay";
    const STORAGE_KEY = "aoe2-civs-overlay:site-lang";

    // ---- language ----
    function setLang(lang) {
        document.documentElement.lang = lang;
        document.documentElement.dataset.lang = lang;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // ignore: private mode
        }
        render();
    }
    let saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch {
        // ignore
    }
    const initial = saved || ((navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en");
    for (const b of document.querySelectorAll("[data-set-lang]"))
        b.addEventListener("click", () => setLang(b.dataset.setLang));

    // ---- system ----
    const ua = navigator.userAgent;
    const os = /Windows/i.test(ua) ? "windows" : /Mac/i.test(ua) ? "mac" : /Linux|X11/i.test(ua) ? "linux" : null;
    if (os) document.documentElement.dataset.os = os;

    const T = {
        en: {
            windows: "for Windows",
            mac: "for macOS (Intel and Apple Silicon)",
            linux: "for Linux (AppImage)",
            other: "Other systems:",
            all: "All files",
            loading: "Looking for the latest version…",
            none: "The first version of the new overlay is about to be published. Check the Releases page.",
            failed: "Couldn't reach GitHub. Get the files from the Releases page.",
            version: (v, d) => `Version ${v}, ${d}`,
        },
        es: {
            windows: "para Windows",
            mac: "para macOS (Intel y Apple Silicon)",
            linux: "para Linux (AppImage)",
            other: "Otros sistemas:",
            all: "Todos los archivos",
            loading: "Buscando la última versión…",
            none: "La primera versión del overlay nuevo está por publicarse. Mirá la página de Releases.",
            failed: "No se pudo consultar GitHub. Bajá los archivos desde la página de Releases.",
            version: (v, d) => `Versión ${v}, ${d}`,
        },
    };
    const lang = () => document.documentElement.dataset.lang || "en";

    // Installer names tauri-action gives each system
    const PATTERNS = {
        windows: /_x64-setup\.exe$/,
        mac: /_universal\.dmg$/,
        linux: /_amd64\.AppImage$/,
    };

    let release = null; // { version, date, urls: { windows, mac, linux } }
    let state = "loading";

    function render() {
        const t = T[lang()];
        const main = document.getElementById("download-main");
        const mainOs = document.getElementById("download-main-os");
        const other = document.getElementById("download-other");
        const status = document.getElementById("download-status");
        other.replaceChildren();
        status.textContent = "";

        if (state !== "ready") {
            main.href = `https://github.com/${REPO}/releases`;
            mainOs.textContent = "";
            status.textContent = t[state];
            return;
        }
        const primary = os && release.urls[os] ? os : null;
        main.href = primary ? release.urls[primary] : `https://github.com/${REPO}/releases/latest`;
        mainOs.textContent = primary ? t[primary] : "";
        other.append(t.other + " ");
        for (const sys of ["windows", "mac", "linux"]) {
            if (sys === primary || !release.urls[sys]) continue;
            const a = document.createElement("a");
            a.href = release.urls[sys];
            a.textContent = { windows: "Windows", mac: "macOS", linux: "Linux" }[sys];
            other.append(a, " · ");
        }
        const all = document.createElement("a");
        all.href = `https://github.com/${REPO}/releases/latest`;
        all.textContent = t.all;
        other.append(all);
        status.textContent = t.version(
            release.version,
            new Date(release.date).toLocaleDateString(lang(), { year: "numeric", month: "long", day: "numeric" })
        );
    }

    async function load() {
        try {
            const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
            if (!res.ok) throw new Error(String(res.status));
            const r = await res.json();
            const urls = {};
            for (const [sys, re] of Object.entries(PATTERNS)) {
                const asset = r.assets.find((a) => re.test(a.name));
                if (asset) urls[sys] = asset.browser_download_url;
            }
            // The old Electron release (v1) has none of these files
            if (!Object.keys(urls).length) state = "none";
            else {
                release = { version: r.tag_name.replace(/^v/, ""), date: r.published_at, urls };
                state = "ready";
            }
        } catch {
            state = "failed";
        }
        render();
    }

    setLang(initial);
    load();
})();
