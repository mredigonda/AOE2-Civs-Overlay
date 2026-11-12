(function () {
    "use strict";

    const tauri = window.__TAURI__;
    const invoke = (cmd, args) => (tauri ? tauri.core.invoke(cmd, args) : Promise.resolve());

    const STORAGE_KEY = "aoe2-civs-overlay:settings";

    // Every block of a civ's card, in the order it is shown. The settings panel
    // lets each one be turned off.
    const SECTIONS = [
        { id: "focus", label: "Focus" },
        { id: "civilizationBonuses", label: "Civilization bonuses" },
        { id: "uniqueUnits", label: "Unique units" },
        { id: "uniqueTechnologies", label: "Unique technologies" },
        { id: "uniqueBuildings", label: "Unique buildings" },
        { id: "otherTechnologies", label: "Other technologies" },
        { id: "teamBonus", label: "Team bonus" },
        { id: "wonder", label: "Wonder" },
    ];

    const defaults = {
        showRival: true,
        sections: Object.fromEntries(SECTIONS.map((s) => [s.id, s.id !== "wonder"])),
        you: null,
        rival: null,
    };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            return { ...defaults, ...saved, sections: { ...defaults.sections, ...saved.sections } };
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
    let civs = [];
    let pickers = {};

    const $ = (id) => document.getElementById(id);

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
        li.append(el("strong", "", name + ": "), document.createTextNode(description));
    }

    function block(title, content) {
        const section = el("section", "block");
        section.append(el("h3", "", title), content);
        return section;
    }

    function card(civ, role) {
        const article = el("article", "card");
        if (!civ) {
            article.append(el("p", "empty", role === "you" ? "Pick your civ" : "Pick the rival's civ"));
            return article;
        }
        article.append(el("h2", "", civ.name));
        const on = settings.sections;
        if (on.focus && civ.focus) article.append(el("p", "focus", civ.focus));
        if (on.civilizationBonuses && civ.civilizationBonuses.length)
            article.append(block("Bonuses", list(civ.civilizationBonuses, (li, b) => (li.textContent = b))));
        if (on.uniqueUnits && civ.uniqueUnits.length)
            article.append(block("Unique units", list(civ.uniqueUnits, named)));
        if (on.uniqueTechnologies && civ.uniqueTechnologies.length)
            article.append(block("Unique technologies", list(civ.uniqueTechnologies, named)));
        if (on.uniqueBuildings && civ.uniqueBuildings)
            article.append(block("Unique buildings", list(civ.uniqueBuildings, named)));
        if (on.otherTechnologies && civ.otherTechnologies)
            for (const group of civ.otherTechnologies) {
                const content = el("div");
                if (group.note) content.append(el("p", "note", group.note));
                content.append(list(group.items, named));
                article.append(block(group.group, content));
            }
        if (on.teamBonus && civ.teamBonus) article.append(block("Team bonus", el("p", "", civ.teamBonus)));
        if (on.wonder && civ.wonder) article.append(block("Wonder", el("p", "", civ.wonder)));
        return article;
    }

    const byCode = (code) => civs.find((c) => c.code === code) || null;

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
        requestAnimationFrame(() => {
            fitQueued = false;
            const root = $("root");
            let bottom = root.scrollHeight;
            for (const dropdown of document.querySelectorAll(".pick-list:not([hidden])")) {
                bottom = Math.max(bottom, dropdown.getBoundingClientRect().bottom + window.scrollY + 8);
            }
            invoke("fit_window", { width: root.offsetWidth, height: Math.ceil(bottom) });
        });
    }

    function buildSettings() {
        const toggles = $("section-toggles");
        for (const s of SECTIONS) {
            const label = el("label");
            const box = el("input");
            box.type = "checkbox";
            box.dataset.section = s.id;
            label.append(box, document.createTextNode(" " + s.label));
            toggles.append(label);
        }
        const panel = $("settings");
        panel.querySelector("[data-setting=showRival]").checked = settings.showRival;
        for (const box of panel.querySelectorAll("[data-section]"))
            box.checked = !!settings.sections[box.dataset.section];
        panel.addEventListener("change", (e) => {
            const box = e.target;
            if (box.dataset.setting) settings[box.dataset.setting] = box.checked;
            if (box.dataset.section) settings.sections[box.dataset.section] = box.checked;
            saveSettings();
            render();
        });
        $("settings-btn").addEventListener("click", () => {
            panel.hidden = !panel.hidden;
            fit();
        });
    }

    async function main() {
        civs = await (await fetch("./civ-info.json")).json();
        civs.sort((a, b) => a.name.localeCompare(b.name));

        for (const role of ["you", "rival"]) {
            pickers[role] = new CivSearch({
                mount: $("pick-" + role),
                civs,
                placeholder: role === "you" ? "Your civ" : "Rival",
                onChange: (civ) => {
                    settings[role] = civ.code;
                    saveSettings();
                    render();
                    if (role === "you" && settings.showRival && !settings.rival) pickers.rival.focus();
                },
                onChangeLayout: fit,
            });
            pickers[role].set(byCode(settings[role]));
        }

        buildSettings();
        render();

        // Esc (with no dropdown open) hides the overlay, like the shortcut does.
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") invoke("hide_overlay");
        });

        if (tauri) tauri.event.listen("overlay-shown", () => pickers.you.focus());
        pickers.you.focus();
    }

    main();
})();
