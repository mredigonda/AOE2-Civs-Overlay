// Fuzzy civ picker: type part of a name or code ("byz", "BYZ"), arrows to move,
// Enter to pick. Ported from the Electron version's civ-selector.js.
(function () {
    "use strict";

    function jaroWinkler(a, b) {
        if (a === b) return 1;
        if (!a.length || !b.length) return 0;
        const window = Math.floor(Math.max(a.length, b.length) / 2) - 1;
        if (window < 0) return 0;
        const aHit = new Array(a.length).fill(false);
        const bHit = new Array(b.length).fill(false);
        let matches = 0;
        for (let i = 0; i < a.length; i++) {
            const lo = Math.max(0, i - window);
            const hi = Math.min(b.length, i + window + 1);
            for (let j = lo; j < hi; j++) {
                if (bHit[j] || a[i] !== b[j]) continue;
                aHit[i] = bHit[j] = true;
                matches++;
                break;
            }
        }
        if (!matches) return 0;
        let t = 0;
        for (let i = 0, k = 0; i < a.length; i++) {
            if (!aHit[i]) continue;
            while (!bHit[k]) k++;
            if (a[i] !== b[k]) t++;
            k++;
        }
        const jaro =
            (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
        let prefix = 0;
        while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix++;
        return jaro + prefix * 0.1 * (1 - jaro);
    }

    const norm = (s) =>
        s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    function score(civ, query) {
        const q = norm(query);
        const name = norm(civ.name);
        // A name that starts with what you typed always wins ("ma" → Magyars, Malay…)
        if (name.startsWith(q)) return 2 - name.length / 100;
        return Math.max(jaroWinkler(name, q), jaroWinkler(norm(civ.code), q));
    }

    class CivSearch {
        constructor({ mount, civs, placeholder, onChange, onChangeLayout }) {
            this.civs = civs;
            this.onChange = onChange;
            this.onChangeLayout = onChangeLayout || (() => {});
            this.results = [];
            this.index = -1;

            this.input = document.createElement("input");
            this.input.className = "pick-input";
            this.input.placeholder = placeholder;
            this.input.spellcheck = false;
            this.list = document.createElement("div");
            this.list.className = "pick-list";
            this.list.hidden = true;
            mount.append(this.input, this.list);

            this.input.addEventListener("input", () => this.search());
            // Focus alone (e.g. when the shortcut shows the overlay) only selects the
            // text, so typing replaces it; the list opens on typing, ↓ or a click,
            // and the civ info underneath stays visible until then.
            this.input.addEventListener("focus", () => this.input.select());
            this.input.addEventListener("click", () => {
                if (!this.isOpen) this.search();
            });
            this.input.addEventListener("blur", () => setTimeout(() => this.close(), 120));
            this.input.addEventListener("keydown", (e) => this.key(e));
        }

        get isOpen() {
            return !this.list.hidden;
        }

        search() {
            const q = this.input.value.trim();
            this.results = q
                ? this.civs
                      .map((civ) => ({ civ, s: score(civ, q) }))
                      .filter((r) => r.s > 0.6)
                      .sort((a, b) => b.s - a.s || a.civ.name.localeCompare(b.civ.name))
                      .slice(0, 10)
                      .map((r) => r.civ)
                : this.civs.slice();
            this.index = this.results.length ? 0 : -1;
            this.render();
        }

        render() {
            this.list.replaceChildren(
                ...(this.results.length
                    ? this.results.map((civ, i) => {
                          const item = document.createElement("div");
                          item.className = "pick-item" + (i === this.index ? " selected" : "");
                          item.innerHTML = `<span></span><span class="code"></span>`;
                          item.children[0].textContent = civ.name;
                          item.children[1].textContent = civ.code;
                          item.addEventListener("mousedown", (e) => {
                              e.preventDefault();
                              this.pick(civ);
                          });
                          return item;
                      })
                    : [Object.assign(document.createElement("div"), {
                          className: "pick-empty",
                          textContent: "No civilizations found",
                      })])
            );
            this.list.hidden = false;
            this.list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
            this.onChangeLayout();
        }

        key(e) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!this.isOpen) return this.search();
                const n = this.results.length;
                if (!n) return;
                this.index = (this.index + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
                this.render();
            } else if (e.key === "Enter") {
                e.preventDefault();
                const civ = this.results[this.index];
                if (civ) this.pick(civ);
            } else if (e.key === "Escape" && this.isOpen) {
                e.stopPropagation();
                this.close();
            }
        }

        pick(civ) {
            this.set(civ);
            this.close();
            this.onChange(civ);
        }

        set(civ) {
            this.input.value = civ ? civ.name : "";
        }

        close() {
            if (this.list.hidden) return;
            this.list.hidden = true;
            this.onChangeLayout();
        }

        focus() {
            this.input.focus();
            this.input.select();
        }
    }

    window.CivSearch = CivSearch;
})();
