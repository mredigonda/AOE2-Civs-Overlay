(function () {
    "use strict";

    const tauri = window.__TAURI__;
    const invoke = (cmd, args) => (tauri ? tauri.core.invoke(cmd, args) : Promise.resolve());

    const STORAGE_KEY = "aoe2-civs-overlay:settings";

    // Where each language's civ data comes from (ui/data/*.json, built by the
    // scripts in src/manual-workflows). "ui" picks the interface strings below.
    const LANGUAGES = [
        { id: "en-fandom", label: "English · Fandom (detailed)", ui: "en", names: "game-en" },
        { id: "game-en", label: "English · in-game text", ui: "en" },
        { id: "es-fandom", label: "Español · Fandom (detallado)", ui: "es", names: "game-es" },
        { id: "game-mx", label: "Español (Latinoamérica) · texto del juego", ui: "es" },
        { id: "game-es", label: "Español (España) · texto del juego", ui: "es" },
        { id: "game-br", label: "Português (Brasil)", ui: "en" },
        { id: "game-de", label: "Deutsch", ui: "en" },
        { id: "game-fr", label: "Français", ui: "en" },
        { id: "game-it", label: "Italiano", ui: "en" },
        { id: "game-pl", label: "Polski", ui: "en" },
        { id: "game-ru", label: "Русский", ui: "en" },
        { id: "game-tr", label: "Türkçe", ui: "en" },
        { id: "game-ms", label: "Bahasa Melayu", ui: "en" },
        { id: "game-vi", label: "Tiếng Việt", ui: "en" },
        { id: "game-hi", label: "हिन्दी", ui: "en" },
        { id: "game-jp", label: "日本語", ui: "en" },
        { id: "game-ko", label: "한국어", ui: "en" },
        { id: "game-zh", label: "简体中文", ui: "en" },
        { id: "game-tw", label: "繁體中文", ui: "en" },
    ];

    const UI = {
        en: {
            you: "Your civ",
            rival: "Rival",
            vs: "vs",
            pickYou: "Pick your civ",
            pickRival: "Pick the rival's civ",
            noResults: "No civilizations found",
            language: "Language",
            showRival: "Show rival column",
            sections: "Sections",
            source: "Source",
            focus: "Focus",
            civilizationBonuses: "Bonuses",
            uniqueUnits: "Unique units",
            uniqueTechnologies: "Unique technologies",
            uniqueBuildings: "Unique buildings",
            otherTechnologies: "Other technologies",
            teamBonus: "Team bonus",
            wonder: "Wonder",
            techTree: "Tech tree",
            treeGroups: "Tech tree lines",
            army: "Army",
            economy: "Economy",
            defense: "Defense",
            navy: "Navy",
            lacks: "lacks",
            complete: "complete",
            none: "doesn't have",
        },
        es: {
            you: "Tu civ",
            rival: "Rival",
            vs: "vs",
            pickYou: "Elegí tu civ",
            pickRival: "Elegí la civ del rival",
            noResults: "No se encontraron civilizaciones",
            language: "Idioma",
            showRival: "Mostrar la columna del rival",
            sections: "Secciones",
            source: "Fuente",
            focus: "Enfoque",
            civilizationBonuses: "Bonificaciones",
            uniqueUnits: "Unidades únicas",
            uniqueTechnologies: "Tecnologías únicas",
            uniqueBuildings: "Edificios únicos",
            otherTechnologies: "Otras tecnologías",
            teamBonus: "Bonificación de equipo",
            wonder: "Maravilla",
            techTree: "Árbol tecnológico",
            treeGroups: "Líneas del árbol",
            army: "Ejército",
            economy: "Economía",
            defense: "Defensa",
            navy: "Marina",
            lacks: "le falta",
            complete: "completo",
            none: "no tiene",
        },
    };

    // Every block of a civ's card, in the order it is shown. The settings panel
    // lets each one be turned off.
    const SECTIONS = [
        "focus",
        "techTree",
        "civilizationBonuses",
        "uniqueUnits",
        "uniqueTechnologies",
        "uniqueBuildings",
        "otherTechnologies",
        "teamBonus",
        "wonder",
    ];

    const defaults = {
        language: "en-fandom",
        showRival: true,
        sections: Object.fromEntries(SECTIONS.map((s) => [s, s !== "wonder"])),
        treeGroups: { army: true, economy: false, defense: false, navy: false },
        you: null,
        rival: null,
    };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            const merged = {
                ...defaults,
                ...saved,
                sections: { ...defaults.sections, ...saved.sections },
                treeGroups: { ...defaults.treeGroups, ...saved.treeGroups },
            };
            if (!LANGUAGES.some((l) => l.id === merged.language)) merged.language = defaults.language;
            return merged;
        } catch {
            return structuredClone(defaults);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Storage unavailable: settings just won't survive a restart.
        }
    }

    const settings = loadSettings();
    let data = { civs: [], labels: {}, source: "" };
    let tree = null; // ui/data/tree.json
    let treeNames = {}; // English node name → name in the current language
    const pickers = {};
    const cache = new Map();

    const $ = (id) => document.getElementById(id);
    const language = () => LANGUAGES.find((l) => l.id === settings.language);
    const t = (key) => UI[language().ui][key];
    // Section titles: the game's own words when the data brings them
    const title = (key) => data.labels[key] || t(key);

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function list(items, render) {
        const ul = el("ul");
        for (const item of items) {
            const li = el("li");
            render(li, item);
            ul.append(li);
        }
        return ul;
    }

    function named(li, { name, description }) {
        if (!description) return (li.textContent = name);
        li.append(el("strong", "", name + ": "), document.createTextNode(description));
    }

    function block(heading, content) {
        const section = el("section", "block");
        section.append(el("h3", "", heading), content);
        return section;
    }

    function icon(name, className, tip) {
        const img = el("img", className);
        img.src = tree.icons[name];
        img.alt = img.title = tip || treeNames[name] || name;
        return img;
    }

    // The red cross the game's tech tree draws over what a civ can't get
    function crossed(name, tip) {
        const wrap = el("span", "tree-x");
        wrap.append(icon(name, "tree-icon", tip));
        return wrap;
    }

    // What the civ lacks, line by line, as the game's icons: for each line with
    // gaps, its best unit and then each missing upgrade or tech, crossed out.
    // Lines it doesn't have at all go in one crossed-out row, complete lines in
    // a row of small icons.
    function techTree(code) {
        const lines = tree?.civs[code];
        if (!lines) return null;
        const wrap = el("div", "tree");
        const none = el("div", "tree-row tree-none");
        const full = el("div", "tree-row tree-full");
        for (const line of tree.lines) {
            if (!settings.treeGroups[line.group]) continue;
            const s = lines[line.id];
            if (!s) continue;
            if (s.none) none.append(crossed(s.none, `${t("none")}: ${treeNames[s.none] || s.none}`));
            else if (!s.missing.length) full.append(icon(s.best, "tree-icon small", `${treeNames[s.best]} · ${t("complete")}`));
            else {
                const row = el("div", "tree-row");
                if (s.best) row.append(icon(s.best, "tree-icon best"));
                const names = s.missing.map((m) => treeNames[m] || m).join(", ");
                for (const m of s.missing) row.append(crossed(m, `${t("lacks")}: ${treeNames[m] || m}`));
                row.title = `${s.best ? treeNames[s.best] + " · " : ""}${t("lacks")}: ${names}`;
                wrap.append(row);
            }
        }
        if (none.childElementCount) wrap.append(none);
        if (full.childElementCount) wrap.append(full);
        return wrap.childElementCount ? wrap : null;
    }

    function card(civ, role) {
        const article = el("article", "card");
        if (!civ) {
            article.append(el("p", "empty", role === "you" ? t("pickYou") : t("pickRival")));
            return article;
        }
        article.append(el("h2", "", civ.name));
        const on = settings.sections;
        if (on.focus && civ.focus) article.append(el("p", "focus", civ.focus));
        const treeView = on.techTree && techTree(civ.code);
        if (treeView) article.append(treeView);
        if (on.civilizationBonuses && civ.civilizationBonuses.length)
            article.append(
                block(title("civilizationBonuses"), list(civ.civilizationBonuses, (li, b) => (li.textContent = b)))
            );
        if (on.uniqueUnits && civ.uniqueUnits.length)
            article.append(block(title("uniqueUnits"), list(civ.uniqueUnits, named)));
        if (on.uniqueTechnologies && civ.uniqueTechnologies.length)
            article.append(block(title("uniqueTechnologies"), list(civ.uniqueTechnologies, named)));
        if (on.uniqueBuildings && civ.uniqueBuildings)
            article.append(block(title("uniqueBuildings"), list(civ.uniqueBuildings, named)));
        if (on.otherTechnologies && civ.otherTechnologies)
            for (const group of civ.otherTechnologies) {
                const content = el("div");
                if (group.note) content.append(el("p", "note", group.note));
                content.append(list(group.items, named));
                article.append(block(group.group, content));
            }
        if (on.teamBonus && civ.teamBonus) article.append(block(title("teamBonus"), el("p", "", civ.teamBonus)));
        if (on.wonder && civ.wonder) article.append(block(title("wonder"), el("p", "", civ.wonder)));
        return article;
    }

    const byCode = (code) => data.civs.find((c) => c.code === code) || null;

    function render() {
        $("pick-rival").hidden = !settings.showRival;
        $("vs").hidden = !settings.showRival;
        const columns = [card(byCode(settings.you), "you")];
        if (settings.showRival) columns.push(card(byCode(settings.rival), "rival"));
        $("columns").replaceChildren(...columns);
        $("root").classList.toggle("two", settings.showRival);
        fit();
    }

    // The window is exactly as big as what it shows (the open dropdown included),
    // so the rest of the screen stays clickable.
    let fitQueued = false;
    function fit() {
        if (fitQueued) return;
        fitQueued = true;
        // setTimeout, not requestAnimationFrame: the web view pauses animation
        // frames while the window is hidden or on another Space.
        setTimeout(() => {
            fitQueued = false;
            const root = $("root");
            let bottom = root.scrollHeight;
            for (const dropdown of document.querySelectorAll(".pick-list:not([hidden])")) {
                bottom = Math.max(bottom, dropdown.getBoundingClientRect().bottom + window.scrollY + 8);
            }
            invoke("fit_window", { width: root.offsetWidth, height: Math.ceil(bottom) });
        }, 0);
    }

    async function loadTreeNames() {
        const source = language().names || language().id;
        treeNames = (await loadLanguage(source)).treeNames || {};
    }

    async function loadLanguage(id) {
        if (!cache.has(id)) {
            const json = await (await fetch(`./data/${id}.json`)).json();
            if (Array.isArray(json.civs)) json.civs.sort((a, b) => a.name.localeCompare(b.name));
            json.labels ||= {};
            cache.set(id, json);
        }
        return cache.get(id);
    }

    // Everything that shows interface text, redone when the language changes.
    function applyLanguage() {
        document.documentElement.lang = language().ui;
        $("vs").textContent = t("vs");
        $("language-label").textContent = t("language");
        $("show-rival-label").textContent = t("showRival");
        $("sections-title").textContent = t("sections");
        $("source").textContent = `${t("source")}: ${data.source}`;
        for (const span of document.querySelectorAll("[data-section-label]"))
            span.textContent = t(span.dataset.sectionLabel);
        $("tree-groups-title").textContent = t("treeGroups");
        for (const span of document.querySelectorAll("[data-group-label]"))
            span.textContent = t(span.dataset.groupLabel);
        for (const role of ["you", "rival"]) {
            pickers[role].setCivs(data.civs, t(role), t("noResults"));
            pickers[role].set(byCode(settings[role]));
        }
        render();
    }

    function buildSettings() {
        const select = $("language");
        for (const l of LANGUAGES) select.append(Object.assign(el("option", "", l.label), { value: l.id }));
        select.value = settings.language;
        select.addEventListener("change", async () => {
            settings.language = select.value;
            saveSettings();
            data = await loadLanguage(settings.language);
            await loadTreeNames();
            applyLanguage();
        });

        const toggles = $("section-toggles");
        for (const id of SECTIONS) {
            const label = el("label");
            const box = el("input");
            box.type = "checkbox";
            box.dataset.section = id;
            box.checked = !!settings.sections[id];
            const text = el("span");
            text.dataset.sectionLabel = id;
            label.append(box, " ", text);
            toggles.append(label);
        }
        const groups = $("tree-group-toggles");
        for (const id of Object.keys(defaults.treeGroups)) {
            const label = el("label");
            const box = el("input");
            box.type = "checkbox";
            box.dataset.group = id;
            box.checked = !!settings.treeGroups[id];
            const text = el("span");
            text.dataset.groupLabel = id;
            label.append(box, " ", text);
            groups.append(label);
        }
        const panel = $("settings");
        panel.querySelector("[data-setting=showRival]").checked = settings.showRival;
        panel.addEventListener("change", (e) => {
            const box = e.target;
            if (box.dataset.setting) settings[box.dataset.setting] = box.checked;
            else if (box.dataset.section) settings.sections[box.dataset.section] = box.checked;
            else if (box.dataset.group) settings.treeGroups[box.dataset.group] = box.checked;
            else return;
            saveSettings();
            render();
        });
        $("settings-btn").addEventListener("click", () => {
            panel.hidden = !panel.hidden;
            fit();
        });
    }

    async function main() {
        data = await loadLanguage(settings.language);
        tree = await loadLanguage("tree");
        await loadTreeNames();

        for (const role of ["you", "rival"]) {
            pickers[role] = new CivSearch({
                mount: $("pick-" + role),
                onChange: (civ) => {
                    settings[role] = civ.code;
                    saveSettings();
                    render();
                    if (role === "you" && settings.showRival && !settings.rival) pickers.rival.focus();
                },
                onChangeLayout: fit,
            });
        }

        buildSettings();
        applyLanguage();

        // Esc (with no dropdown open) hides the overlay, like the shortcut does.
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") invoke("hide_overlay");
        });

        if (tauri)
            tauri.event.listen("overlay-shown", () => {
                pickers.you.close();
                pickers.rival.close();
                pickers.you.focus();
            });
        pickers.you.focus();
    }

    main();
})();
