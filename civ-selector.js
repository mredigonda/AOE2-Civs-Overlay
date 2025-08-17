(function () {
    "use strict";

    // In-house Jaro-Winkler implementation
    function jaroWinkler(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;

        const matchWindow =
            Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
        if (matchWindow < 0) return 0.0;

        const str1Matches = new Array(str1.length).fill(false);
        const str2Matches = new Array(str2.length).fill(false);

        let matches = 0;
        let transpositions = 0;

        // Find matches
        for (let i = 0; i < str1.length; i++) {
            const start = Math.max(0, i - matchWindow);
            const end = Math.min(str2.length, i + matchWindow + 1);

            for (let j = start; j < end; j++) {
                if (str2Matches[j] || str1[i] !== str2[j]) continue;
                str1Matches[i] = true;
                str2Matches[j] = true;
                matches++;
                break;
            }
        }

        if (matches === 0) return 0.0;

        // Find transpositions
        let k = 0;
        for (let i = 0; i < str1.length; i++) {
            if (!str1Matches[i]) continue;
            while (!str2Matches[k]) k++;
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }

        const jaroDistance =
            (matches / str1.length +
                matches / str2.length +
                (matches - transpositions / 2) / matches) /
            3.0;

        // Winkler modification
        const prefixLength = Math.min(4, Math.min(str1.length, str2.length));
        let commonPrefix = 0;
        for (let i = 0; i < prefixLength; i++) {
            if (str1[i] === str2[i]) {
                commonPrefix++;
            } else {
                break;
            }
        }

        const winklerWeight = 0.1;
        return jaroDistance + commonPrefix * winklerWeight * (1 - jaroDistance);
    }

    // Normalize string by lowercasing and removing accents
    function normalizeString(str) {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    // Highlight matched substrings
    function highlightMatch(text, query) {
        if (!query) return text;

        const normalizedText = normalizeString(text);
        const normalizedQuery = normalizeString(query);
        const index = normalizedText.indexOf(normalizedQuery);

        if (index === -1) return text;

        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);

        return `${before}<span class="highlight">${match}</span>${after}`;
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Main CivSelect class
    class CivSelect {
        constructor(options) {
            this.mount = options.mount;
            this.civs = options.civs || [];
            this.value = options.value || null;
            this.onChange = options.onChange || (() => {});
            this.isOpen = false;
            this.selectedIndex = -1;

            this.init();
        }

        init() {
            this.createElements();
            this.bindEvents();
            this.render();
        }

        createElements() {
            // Clear any existing content in the mount element
            this.mount.innerHTML = "";

            this.container = document.createElement("div");
            this.container.className = "civ-select-container";

            this.input = document.createElement("input");
            this.input.className = "civ-select-input";
            this.input.type = "text";
            this.input.placeholder = "Search civilizations...";

            this.dropdown = document.createElement("div");
            this.dropdown.className = "civ-select-dropdown";

            this.container.appendChild(this.input);
            this.container.appendChild(this.dropdown);
            this.mount.appendChild(this.container);
        }

        bindEvents() {
            // Input events
            this.input.addEventListener(
                "input",
                debounce((e) => {
                    this.handleInput(e.target.value);
                }, 120)
            );

            this.input.addEventListener("keydown", (e) => {
                this.handleKeydown(e);
            });

            this.input.addEventListener("focus", () => {
                // Show all civilizations when input is focused
                const initialResults = this.civs.map((civ) => ({
                    civ: civ,
                    score: 1.0,
                    match: civ.name,
                }));
                this.renderResults(initialResults);
                this.open();

                // Select all text for quick replacement
                this.input.select();
            });

            // Click outside to close
            document.addEventListener("click", (e) => {
                if (!this.container.contains(e.target)) {
                    this.close();
                }
            });

            // Prevent clicks on container from closing
            this.container.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }

        handleInput(query) {
            if (!query.trim()) {
                // Show all civilizations when input is empty
                const initialResults = this.civs.map((civ) => ({
                    civ: civ,
                    score: 1.0,
                    match: civ.name,
                }));
                this.renderResults(initialResults);
                this.open();
                return;
            }

            const results = this.searchCivs(query);
            this.renderResults(results);
            this.open();
        }

        searchCivs(query) {
            const normalizedQuery = normalizeString(query);
            const results = [];

            for (const civ of this.civs) {
                let bestScore = 0;
                let bestMatch = "";

                // Check name
                const nameScore = jaroWinkler(
                    normalizeString(civ.name),
                    normalizedQuery
                );
                if (nameScore > bestScore) {
                    bestScore = nameScore;
                    bestMatch = civ.name;
                }

                // Check code
                const codeScore = jaroWinkler(
                    normalizeString(civ.code),
                    normalizedQuery
                );
                if (codeScore > bestScore) {
                    bestScore = codeScore;
                    bestMatch = civ.code;
                }

                if (bestScore > 0.3) {
                    // Threshold for relevance
                    results.push({
                        civ: civ,
                        score: bestScore,
                        match: bestMatch,
                    });
                }
            }

            // Sort by score (descending) then by name
            results.sort((a, b) => {
                if (Math.abs(a.score - b.score) < 0.01) {
                    return a.civ.name.localeCompare(b.civ.name);
                }
                return b.score - a.score;
            });

            return results.slice(0, 10); // Cap to top 10
        }

        renderResults(results) {
            this.dropdown.innerHTML = "";

            if (results.length === 0) {
                const noResults = document.createElement("div");
                noResults.className = "civ-select-no-results";
                noResults.textContent = "No civilizations found";
                this.dropdown.appendChild(noResults);
                return;
            }

            results.forEach((result, index) => {
                const item = document.createElement("div");
                item.className = "civ-select-item";
                item.dataset.index = index;

                const nameSpan = document.createElement("span");
                nameSpan.className = "civ-name";
                nameSpan.innerHTML = highlightMatch(
                    result.civ.name,
                    this.input.value
                );

                const codeSpan = document.createElement("span");
                codeSpan.className = "civ-code";
                codeSpan.textContent = result.civ.code;

                item.appendChild(nameSpan);
                item.appendChild(codeSpan);

                item.addEventListener("click", () => {
                    this.selectCiv(result.civ);
                });

                this.dropdown.appendChild(item);
            });

            // Scroll to top of dropdown
            this.dropdown.scrollTop = 0;

            // Highlight the first option
            this.selectedIndex = 0;
            const items = this.dropdown.querySelectorAll(".civ-select-item");
            this.updateSelection(items);
        }

        handleKeydown(e) {
            const items = this.dropdown.querySelectorAll(".civ-select-item");

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    this.selectedIndex = Math.min(
                        this.selectedIndex + 1,
                        items.length - 1
                    );
                    this.updateSelection(items);
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateSelection(items);
                    break;

                case "Enter":
                    e.preventDefault();
                    if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                        const civ = this.searchCivs(this.input.value)[
                            this.selectedIndex
                        ]?.civ;
                        if (civ) {
                            this.selectCiv(civ);
                        }
                    } else if (items.length > 0) {
                        // Select the first option if nothing is currently selected
                        const civ = this.searchCivs(this.input.value)[0]?.civ;
                        if (civ) {
                            this.selectCiv(civ);
                        }
                    }
                    break;

                case "Escape":
                    this.close();
                    break;
            }
        }

        updateSelection(items) {
            items.forEach((item, index) => {
                item.classList.toggle("selected", index === this.selectedIndex);
            });
        }

        selectCiv(civ) {
            this.value = civ;
            this.input.value = civ.name;
            this.close();
            this.onChange(civ);
        }

        open() {
            this.isOpen = true;
            this.dropdown.classList.add("show");
        }

        close() {
            this.isOpen = false;
            this.dropdown.classList.remove("show");
            this.selectedIndex = -1;
        }

        focus() {
            this.input.focus();
        }
    }

    // Expose to window
    window.CivSelect = {
        init: function (options) {
            return new CivSelect(options);
        },
        open: function () {
            if (window.civSelectInstance) {
                window.civSelectInstance.open();
            }
        },
        close: function () {
            if (window.civSelectInstance) {
                window.civSelectInstance.close();
            }
        },
        focus: function () {
            if (window.civSelectInstance) {
                window.civSelectInstance.focus();
            }
        },
    };
})();
