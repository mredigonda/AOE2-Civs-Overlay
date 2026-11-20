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
            hp: "HP",
            attack: "Attack",
            armor: "Armor",
            range: "Range",
            speed: "Speed",
            reload: "Reload",
            Food: "food",
            Wood: "wood",
            Gold: "gold",
            Stone: "stone",
            baseStats: "Base values, before civ bonuses and upgrades",
            civsMode: "Civilizations",
            boMode: "Build order",
            boNone: "No build orders yet. Add one with +.",
            boAdd: "Add build orders",
            boRemove: "Remove this build order",
            boRemoveSure: "Click again to remove it",
            boPasteHint:
                "Paste one or more build orders in RTS Overlay's format (JSON). On buildorderguide.com, open a build and use “Copy to clipboard for RTS Overlay”. You can also just paste it anywhere on the overlay.",
            boImport: "Add",
            boAdded: "Added",
            boForCiv: "For {civ}",
            boAnyCiv: "Any civ",
            boOtherCivs: "Other civs",
            boMismatch: "This build is for {civs}",
            boSwitch: "Pick {civ}",
            boBy: "by",
            boEstimated: "times estimated",
            boStep: "Step {n} of {total}",
            boNext: "Next",
            boDoneBy: "done by",
            boVillagers: "villagers",
            boBuilder: "builders",
            boTimerStart: "Start the timer (game time)",
            boTimerPause: "Pause the timer",
            boTimerReset: "Back to the start",
            boPrevious: "Previous step",
            boNextStep: "Next step",
            boKeys: "In game: {mod}] next step · {mod}[ back · {mod}\\ timer",
            age1: "Dark Age",
            age2: "Feudal Age",
            age3: "Castle Age",
            age4: "Imperial Age",
            boAgeUp: "Click up to the {age}",
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
            hp: "PR",
            attack: "Ataque",
            armor: "Armadura",
            range: "Alcance",
            speed: "Velocidad",
            reload: "Recarga",
            Food: "alimento",
            Wood: "madera",
            Gold: "oro",
            Stone: "piedra",
            baseStats: "Valores base, sin bonos de la civ ni mejoras",
            civsMode: "Civilizaciones",
            boMode: "Build order",
            boNone: "Todavía no hay build orders. Agregá uno con +.",
            boAdd: "Agregar build orders",
            boRemove: "Quitar este build order",
            boRemoveSure: "Hacé clic de nuevo para quitarlo",
            boPasteHint:
                "Pegá uno o más build orders en el formato de RTS Overlay (JSON). En buildorderguide.com, abrí uno y usá “Copy to clipboard for RTS Overlay”. También podés pegarlo en cualquier parte del overlay.",
            boImport: "Agregar",
            boAdded: "Agregados",
            boForCiv: "Para {civ}",
            boAnyCiv: "Cualquier civ",
            boOtherCivs: "Otras civs",
            boMismatch: "Este build es para {civs}",
            boSwitch: "Elegir {civ}",
            boBy: "de",
            boEstimated: "tiempos estimados",
            boStep: "Paso {n} de {total}",
            boNext: "Después",
            boDoneBy: "listo a los",
            boVillagers: "aldeanos",
            boBuilder: "constructores",
            boTimerStart: "Arrancar el reloj (tiempo de juego)",
            boTimerPause: "Pausar el reloj",
            boTimerReset: "Volver al principio",
            boPrevious: "Paso anterior",
            boNextStep: "Paso siguiente",
            boKeys: "En el juego: {mod}] paso siguiente · {mod}[ atrás · {mod}\\ reloj",
            age1: "Edad Oscura",
            age2: "Edad Feudal",
            age3: "Edad de los Castillos",
            age4: "Edad Imperial",
            boAgeUp: "Pasá a la {age}",
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
        mode: "civs", // or "bo": following a build order
        bo: null, // the build order's id
        boStep: 0,
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
    let treeHelp = {}; // English node name → the game's help text, in the current language
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

    // status: what the tooltip says about it for this civ ("lacks", "complete"…)
    function icon(name, className, status) {
        const img = el("img", className);
        img.src = tree.icons[name];
        img.alt = treeNames[name] || name;
        img.dataset.node = name;
        if (status) img.dataset.status = status;
        return img;
    }

    // The red cross the game's tech tree draws over what a civ can't get
    function crossed(name, status) {
        const wrap = el("span", "tree-x");
        wrap.append(icon(name, "tree-icon", status));
        return wrap;
    }

    // ---- tooltip: shows at once on hover (the native one waits a second) ----
    const tip = el("div", "tip");
    tip.hidden = true;
    document.body.append(tip);

    const number = (n) => String(Math.round(n * 100) / 100);

    function fillTip(name, status) {
        tip.replaceChildren();
        const head = el("div", "tip-head");
        head.append(el("strong", "", treeNames[name] || name));
        if (status) head.append(el("span", `tip-status ${status}`, t(status)));
        tip.append(head);
        if (treeHelp[name]) tip.append(el("p", "tip-help", treeHelp[name]));
        const st = tree.stats?.[name];
        if (!st) return;
        if (st.hp !== undefined) {
            const stats = el("div", "tip-stats");
            const add = (label, value) => {
                const cell = el("span");
                cell.append(el("b", "", value), document.createTextNode(" " + label));
                stats.append(cell);
            };
            add(t("hp"), number(st.hp));
            add(t("attack"), number(st.attack));
            add(t("armor"), `${number(st.melee)}/${number(st.pierce)}`);
            if (st.range) add(t("range"), number(st.range));
            add(t("speed"), number(st.speed));
            if (st.reload) add(t("reload"), number(st.reload) + " s");
            tip.append(stats);
        }
        const cost = Object.entries(st.cost || {}).map(([r, v]) => `${v} ${t(r)}`);
        if (st.time) cost.push(`${number(st.time)} s`);
        if (cost.length) tip.append(el("div", "tip-cost", cost.join(" · ")));
        if (st.hp !== undefined) tip.append(el("div", "tip-note", t("baseStats")));
    }

    function placeTip(target) {
        const r = target.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        tip.style.left = "0px";
        tip.style.top = "0px";
        const w = tip.offsetWidth;
        tip.style.left = `${Math.max(4, Math.min(r.left, width - w - 4)) + window.scrollX}px`;
        // Below the icon; the window grows to fit it (see fit) and shrinks back
        tip.style.top = `${r.bottom + 6 + window.scrollY}px`;
    }

    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest?.("[data-node]");
        if (!target) return;
        fillTip(target.dataset.node, target.dataset.status);
        tip.hidden = false;
        placeTip(target);
        fit();
    });
    document.addEventListener("mouseout", (e) => {
        const target = e.target.closest?.("[data-node]");
        if (!target || target.contains(e.relatedTarget)) return;
        tip.hidden = true;
        fit();
    });

    // What the civ lacks, line by line, as the game's icons: for each line with
    // gaps, its best unit and then each missing upgrade or tech, crossed out.
    // Lines it doesn't have at all go in one crossed-out row, complete lines in
    // a row of small icons.
    function techTree(code) {
        const summary = tree?.civs[code];
        if (!summary) return null;
        const lines = summary.lines;
        const wrap = el("div", "tree");
        // ★ the civ's unique units first: who they are at a glance
        if (summary.unique.length) {
            const row = el("div", "tree-row tree-unique");
            for (const u of summary.unique) {
                row.append(icon(u.best, "tree-icon best"));
                for (const m of u.missing) row.append(crossed(m, "lacks"));
            }
            wrap.append(row);
        }
        const none = el("div", "tree-row tree-none");
        const full = el("div", "tree-row tree-full");
        for (const line of tree.lines) {
            if (!settings.treeGroups[line.group]) continue;
            const s = lines[line.id];
            if (!s) continue;
            if (s.none) none.append(crossed(s.none, "none"));
            else if (!s.missing.length) full.append(icon(s.best, "tree-icon small", "complete"));
            else {
                const row = el("div", "tree-row");
                if (s.best) row.append(icon(s.best, "tree-icon best"));
                for (const m of s.missing) row.append(crossed(m, "lacks"));
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
        const columns = [card(byCode(settings.you), "you")];
        if (settings.showRival) columns.push(card(byCode(settings.rival), "rival"));
        $("columns").replaceChildren(...columns);
        renderBO(); // also shows or hides each mode's parts, and fits the window
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
            for (const dropdown of document.querySelectorAll(".pick-list:not([hidden]), .tip:not([hidden])")) {
                bottom = Math.max(bottom, dropdown.getBoundingClientRect().bottom + window.scrollY + 8);
            }
            invoke("fit_window", { width: root.offsetWidth, height: Math.ceil(bottom) });
        }, 0);
    }

    async function loadTreeNames() {
        const source = language().names || language().id;
        const names = await loadLanguage(source);
        treeNames = names.treeNames || {};
        treeHelp = names.treeHelp || {};
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

    // ---- build orders ----
    // Saved apart from the settings: they can be big, and a broken one must not
    // cost the settings. Each one is BuildOrder.parse's output plus an id.
    const BO_KEY = "aoe2-civs-overlay:build-orders";
    const BO = window.BuildOrder;
    const MOD = /Mac/.test(navigator.platform) ? "⌘⌥" : "Ctrl+Alt+";
    const fmt = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
    const AGE_ICON = {
        1: "age/DarkAgeIconDE_alpha.webp",
        2: "age/FeudalAgeIconDE_alpha.webp",
        3: "age/CastleAgeIconDE_alpha.webp",
        4: "age/ImperialAgeIconDE_alpha.webp",
    };
    const RES_ICON = {
        food: "resource/Aoe2de_food.webp",
        wood: "resource/Aoe2de_wood.webp",
        gold: "resource/Aoe2de_gold.webp",
        stone: "resource/Aoe2de_stone.webp",
        builder: "resource/Aoe2de_hammer.webp",
    };
    const VILLAGER_ICON = "resource/MaleVillDE_alpha.webp";

    function loadBuildOrders() {
        try {
            const list = JSON.parse(localStorage.getItem(BO_KEY) || "[]");
            return Array.isArray(list) ? list.filter((b) => b && b.id && Array.isArray(b.build_order)) : [];
        } catch {
            return [];
        }
    }
    let buildOrders = loadBuildOrders();
    function saveBuildOrders() {
        try {
            localStorage.setItem(BO_KEY, JSON.stringify(buildOrders));
        } catch {
            // Full or unavailable: they stay for this session.
        }
    }

    const currentBO = () => buildOrders.find((b) => b.id === settings.bo) || null;

    // The timer runs in game seconds: real time × the game's Normal speed.
    const timer = { running: false, startedAt: 0, base: 0, tick: null };
    const clock = () => timer.base + (timer.running ? ((Date.now() - timer.startedAt) / 1000) * BO.GAME_SPEED : 0);
    function setClock(sec) {
        timer.base = Math.max(0, sec);
        timer.startedAt = Date.now();
    }
    function toggleTimer() {
        const bo = currentBO();
        if (!bo) return;
        if (timer.running) {
            timer.base = clock();
            timer.running = false;
            clearInterval(timer.tick);
        } else {
            // From where the shown step starts, so starting late still lines up
            if (timer.base === 0 && settings.boStep > 0) timer.base = bo.build_order[settings.boStep - 1].timeSec;
            timer.running = true;
            timer.startedAt = Date.now();
            timer.tick = setInterval(onTick, 250);
        }
        renderBO();
    }
    function resetTimer() {
        if (timer.running) clearInterval(timer.tick);
        timer.running = false;
        timer.base = 0;
        setStep(0);
    }
    function onTick() {
        const bo = currentBO();
        if (!bo) return;
        // Forward only: a step you moved to by hand stays until its time comes
        const step = BO.stepAt(bo, clock());
        if (step > settings.boStep) setStep(step);
        else {
            const c = $("bo-clock");
            if (c) c.textContent = BO.secToTime(clock());
        }
    }

    function setStep(i) {
        const bo = currentBO();
        if (!bo) return;
        settings.boStep = Math.max(0, Math.min(bo.build_order.length - 1, i));
        saveSettings();
        renderBO();
    }

    // ]/[ : with the timer running they move the clock to that step's start
    // (to catch up or wait), so the timer keeps following from there.
    function moveStep(by) {
        const bo = currentBO();
        if (!bo) return;
        const i = Math.max(0, Math.min(bo.build_order.length - 1, settings.boStep + by));
        if (timer.running) setClock(i > 0 ? bo.build_order[i - 1].timeSec : 0);
        else if (timer.base) timer.base = i > 0 ? bo.build_order[i - 1].timeSec : 0;
        setStep(i);
    }

    function selectBO(id) {
        settings.bo = id;
        settings.boStep = 0;
        resetTimer();
        const bo = currentBO();
        // Nothing picked yet and the build is for one civ: that's your civ
        const codes = bo ? BO.civCodes(bo, data.civs) : [];
        if (!settings.you && codes.length === 1) pickCiv(codes[0]);
        saveSettings();
        renderBO();
    }

    function pickCiv(code) {
        settings.you = code;
        pickers.you.set(byCode(code));
        saveSettings();
        render();
    }

    function addBuildOrders(text) {
        const { orders, errors } = BO.parse(text);
        const stamp = Date.now();
        orders.forEach((o, i) => {
            o.id = `${stamp}-${i}`;
            // Pasting the same build again replaces it instead of piling up copies
            const same = buildOrders.findIndex((b) => b.name === o.name && b.author === o.author);
            if (same >= 0) {
                o.id = buildOrders[same].id;
                buildOrders[same] = o;
            } else buildOrders.push(o);
        });
        if (orders.length) {
            saveBuildOrders();
            selectBO(orders[0].id);
        }
        return { added: orders.length, errors };
    }

    function removeBO() {
        buildOrders = buildOrders.filter((b) => b.id !== settings.bo);
        saveBuildOrders();
        selectBO(buildOrders[0]?.id || null);
    }

    const boImg = (path, className, label) => {
        const img = el("img", className);
        img.src = `img/bo/${path}`;
        img.alt = img.title = label || BO.iconLabel(path);
        // An icon this version doesn't have: its name instead
        img.addEventListener("error", () => img.replaceWith(el("span", "bo-missing", img.alt)), { once: true });
        return img;
    };

    function civLabel(code) {
        return byCode(code)?.name || code;
    }

    // The <select>: builds for your civ first, then for any civ, then the rest
    function boSelect() {
        const select = el("select", "bo-select");
        const groups = { mine: [], any: [], other: [] };
        for (const b of buildOrders) {
            const codes = BO.civCodes(b, data.civs);
            const key = !codes.length ? "any" : codes.includes(settings.you) ? "mine" : "other";
            groups[key].push([b, codes]);
        }
        const add = (label, items) => {
            if (!items.length) return;
            const group = el("optgroup");
            group.label = label;
            for (const [b, codes] of items) {
                const civs = codes.length ? ` · ${codes.map(civLabel).join(", ")}` : "";
                group.append(Object.assign(el("option", "", b.name + civs), { value: b.id }));
            }
            select.append(group);
        };
        if (settings.you) add(fmt("boForCiv", { civ: civLabel(settings.you) }), groups.mine);
        else groups.other.unshift(...groups.mine);
        add(t("boAnyCiv"), groups.any);
        add(t("boOtherCivs"), groups.other);
        select.value = settings.bo || "";
        select.addEventListener("change", () => selectBO(select.value));
        return select;
    }

    function resourceRow(bo, i, compact) {
        const step = bo.build_order[i];
        const change = BO.delta(bo, i);
        const row = el("div", "bo-res" + (compact ? " compact" : ""));
        const prevAge = i > 0 ? bo.build_order[i - 1].age : step.age;
        if (AGE_ICON[step.age]) {
            const age = el("span", "bo-age" + (step.age > prevAge ? " up" : ""));
            age.append(boImg(AGE_ICON[step.age], "bo-icon", t("age" + step.age)));
            row.append(age);
        }
        const vills = el("span", "bo-cell vills");
        const count = step.villager_count >= 0 ? step.villager_count : BO.RESOURCES.reduce((n, k) => n + Math.max(0, step.resources[k]), 0);
        vills.append(boImg(VILLAGER_ICON, "bo-icon", t("boVillagers")), el("b", "", String(count)));
        row.append(vills);
        for (const k of [...BO.RESOURCES, "builder"]) {
            const v = step.resources[k];
            if (v === undefined || (k === "builder" && v <= 0)) continue;
            const cell = el("span", "bo-cell" + (change[k] > 0 ? " more" : change[k] < 0 ? " less" : v <= 0 ? " zero" : ""));
            cell.append(boImg(RES_ICON[k], "bo-icon", k === "builder" ? t("boBuilder") : t(k[0].toUpperCase() + k.slice(1))));
            cell.append(el("b", "", v < 0 ? "–" : String(v)));
            if (change[k]) cell.append(el("small", "", (change[k] > 0 ? "+" : "") + change[k]));
            row.append(cell);
        }
        return row;
    }

    function notes(step) {
        const ul = el("ul", "bo-notes");
        for (const note of step.notes) {
            const li = el("li");
            for (const part of BO.noteParts(note))
                li.append(part.icon ? boImg(part.icon, "bo-icon inline") : document.createTextNode(part.text));
            ul.append(li);
        }
        return ul;
    }

    function stepTime(bo, i) {
        return (bo.estimated ? "~" : "") + BO.secToTime(bo.build_order[i].timeSec);
    }

    function renderBO() {
        const root = $("bo");
        const on = settings.mode === "bo";
        root.hidden = !on;
        $("columns").hidden = on;
        $("pick-rival").hidden = on || !settings.showRival;
        $("vs").hidden = on || !settings.showRival;
        $("root").classList.toggle("two", !on && settings.showRival);
        $("mode-btn").textContent = on ? "🏛" : "📜";
        $("mode-btn").title = on ? t("civsMode") : t("boMode");
        if (!on) return fit();

        const bo = currentBO();
        const panel = el("div", "card bo-card");

        const bar = el("div", "bo-bar");
        if (buildOrders.length) bar.append(boSelect());
        else bar.append(el("span", "empty", t("boNone")));
        const addBtn = el("button", "icon-btn", "+");
        addBtn.title = t("boAdd");
        addBtn.addEventListener("click", () => {
            importOpen = !importOpen;
            renderBO();
        });
        bar.append(addBtn);
        if (bo) {
            const del = el("button", "icon-btn", "🗑");
            del.title = t("boRemove");
            del.addEventListener("click", () => {
                if (del.dataset.sure) return removeBO();
                del.dataset.sure = "1";
                del.title = t("boRemoveSure");
                del.textContent = "🗑?";
                setTimeout(() => {
                    delete del.dataset.sure;
                    del.textContent = "🗑";
                    del.title = t("boRemove");
                }, 3000);
            });
            bar.append(del);
        }
        panel.append(bar);

        if (importOpen || !buildOrders.length) panel.append(importBox());

        if (bo) {
            const meta = el("div", "bo-meta");
            const bits = [];
            if (bo.author) bits.push(`${t("boBy")} ${bo.author}`);
            if (bo.estimated) bits.push(t("boEstimated"));
            meta.textContent = bits.join(" · ");
            panel.append(meta);

            const codes = BO.civCodes(bo, data.civs);
            if (codes.length && settings.you && !codes.includes(settings.you)) {
                const warn = el("div", "bo-warn", fmt("boMismatch", { civs: codes.map(civLabel).join(", ") }) + " ");
                if (codes.length === 1) {
                    const sw = el("button", "link-btn", fmt("boSwitch", { civ: civLabel(codes[0]) }));
                    sw.addEventListener("click", () => {
                        pickCiv(codes[0]);
                        renderBO();
                    });
                    warn.append(sw);
                }
                panel.append(warn);
            }

            const i = Math.min(settings.boStep, bo.build_order.length - 1);
            const step = bo.build_order[i];
            const cur = el("section", "bo-step");
            const head = el("div", "bo-step-head");
            head.append(el("span", "", fmt("boStep", { n: i + 1, total: bo.build_order.length })));
            head.append(el("span", "bo-due", `${t("boDoneBy")} ${stepTime(bo, i)}`));
            cur.append(head, resourceRow(bo, i, false));
            const prevAge = i > 0 ? bo.build_order[i - 1].age : step.age;
            if (step.age > prevAge && AGE_ICON[step.age])
                cur.append(el("div", "bo-ageup", fmt("boAgeUp", { age: t("age" + step.age) })));
            cur.append(notes(step));
            panel.append(cur);

            if (i + 1 < bo.build_order.length) {
                const next = el("section", "bo-step next");
                const nhead = el("div", "bo-step-head");
                nhead.append(el("span", "", t("boNext")), el("span", "bo-due", stepTime(bo, i + 1)));
                next.append(nhead, resourceRow(bo, i + 1, true), notes(bo.build_order[i + 1]));
                panel.append(next);
            }

            const controls = el("div", "bo-controls");
            const btn = (text, titleKey, onClick, disabled) => {
                const b = el("button", "icon-btn", text);
                b.title = t(titleKey);
                b.disabled = !!disabled;
                b.addEventListener("click", onClick);
                return b;
            };
            controls.append(
                btn("◀", "boPrevious", () => moveStep(-1), i === 0),
                btn("▶", "boNextStep", () => moveStep(1), i === bo.build_order.length - 1),
                el("span", "bo-spacer"),
                btn(timer.running ? "⏸" : "⏱", timer.running ? "boTimerPause" : "boTimerStart", toggleTimer),
                Object.assign(el("span", "bo-clock" + (timer.running ? " running" : ""), BO.secToTime(clock())), { id: "bo-clock" }),
                btn("↺", "boTimerReset", resetTimer)
            );
            panel.append(controls);
            panel.append(el("div", "bo-keys", fmt("boKeys", { mod: MOD })));
        }
        root.replaceChildren(panel);
        fit();
    }

    let importOpen = false;
    let importDraft = "";
    function importBox() {
        const box = el("div", "bo-import");
        box.append(el("p", "note", t("boPasteHint")));
        const area = el("textarea");
        area.rows = 4;
        area.spellcheck = false;
        area.value = importDraft;
        area.addEventListener("input", () => (importDraft = area.value));
        const status = el("div", "bo-status");
        const go = el("button", "text-btn", t("boImport"));
        go.addEventListener("click", () => {
            const { added, errors } = addBuildOrders(area.value);
            if (added && !errors.length) {
                importDraft = "";
                importOpen = false;
                return renderBO();
            }
            status.textContent = [added ? `${t("boAdded")}: ${added}` : "", ...errors].filter(Boolean).join(" · ");
            status.className = "bo-status" + (errors.length ? " error" : "");
            fit();
        });
        box.append(area, go, status);
        setTimeout(() => area.focus(), 0);
        return box;
    }

    // Paste a build order anywhere (outside a text field) to add it
    document.addEventListener("paste", (e) => {
        if (e.target.closest?.("input, textarea")) return;
        const text = e.clipboardData?.getData("text") || "";
        if (!text.includes("build_order")) return;
        e.preventDefault();
        settings.mode = "bo";
        const { errors } = addBuildOrders(text);
        if (errors.length) {
            importOpen = true;
            importDraft = text;
        }
        renderBO();
    });

    // With the overlay focused: → / ← steps, space the timer
    document.addEventListener("keydown", (e) => {
        if (settings.mode !== "bo" || e.target.closest?.("input, textarea, select")) return;
        if (e.key === "ArrowRight") moveStep(1);
        else if (e.key === "ArrowLeft") moveStep(-1);
        else if (e.key === " ") toggleTimer();
        else return;
        e.preventDefault();
    });

    function onBuildOrderKey(action) {
        if (action === "next") moveStep(1);
        else if (action === "previous") moveStep(-1);
        else if (action === "timer") toggleTimer();
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
        $("mode-btn").addEventListener("click", () => {
            settings.mode = settings.mode === "bo" ? "civs" : "bo";
            saveSettings();
            render();
        });
        applyLanguage();

        // Esc (with no dropdown open) hides the overlay, like the shortcut does.
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") invoke("hide_overlay");
        });

        if (tauri) {
            tauri.event.listen("overlay-shown", () => {
                pickers.you.close();
                pickers.rival.close();
                if (settings.mode !== "bo") pickers.you.focus();
            });
            tauri.event.listen("build-order", (e) => onBuildOrderKey(e.payload));
        }
        if (settings.mode !== "bo") pickers.you.focus();
    }

    main();
})();
