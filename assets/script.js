(() => {
    "use strict";

    const BASE_URL = "https://chaitanyakhajone.github.io/mywebsites/";

    const gridContainer = document.getElementById("grid-container");
    const searchBar = document.getElementById("search-bar");
    const clearSearchBtn = document.getElementById("clear-search");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const themeLabel = document.getElementById("theme-label");
    const categoryFilter = document.getElementById("category-filter");
    const resultsCount = document.getElementById("results-count");
    const emptyState = document.getElementById("empty-state");
    const resetFiltersBtn = document.getElementById("reset-filters");

    function safeGetTheme() {
        try {
            const saved = localStorage.getItem("theme");
            return saved === "dark" || saved === "light" ? saved : null;
        } catch (_) {
            return null;
        }
    }

    function safeSaveTheme(theme) {
        try {
            localStorage.setItem("theme", theme);
        } catch (_) {
            // The dashboard still works when storage is unavailable.
        }
    }

    function applyTheme(theme) {
        const normalizedTheme = theme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = normalizedTheme;
        const isDark = normalizedTheme === "dark";

        themeIcon.textContent = isDark ? "☀" : "☾";
        themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
        themeToggleBtn.setAttribute("aria-pressed", String(isDark));
        themeToggleBtn.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        safeSaveTheme(normalizedTheme);
    }

    function populateCategories() {
        const categories = [...new Set(
            websitesArray.map(site => site.category).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        categories.forEach(categoryName => {
            const option = document.createElement("option");
            option.value = categoryName;
            option.textContent = categoryName;
            categoryFilter.appendChild(option);
        });
    }

    function createWebsiteCard(site) {
        const card = document.createElement("a");
        card.className = "site-card";

        const destination = /^https?:\/\//i.test(site.link)
            ? site.link
            : new URL(site.link, BASE_URL).href;

        card.href = destination;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute("aria-label", `Open ${site.name} in a new tab`);

        const icon = document.createElement("span");
        icon.className = "site-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = site.icon || "↗";

        const content = document.createElement("span");
        content.className = "site-card-content";

        const title = document.createElement("span");
        title.className = "site-card-title";
        title.textContent = site.name;

        const description = document.createElement("span");
        description.className = "site-card-description";
        description.textContent = site.description || "Open this website.";

        const meta = document.createElement("span");
        meta.className = "site-card-meta";

        const category = document.createElement("span");
        category.className = "category-tag";
        category.textContent = site.category || "Website";

        const openLabel = document.createElement("span");
        openLabel.className = "open-link";
        openLabel.textContent = "Open ↗";
        openLabel.setAttribute("aria-hidden", "true");

        meta.append(category, openLabel);
        content.append(title, description, meta);
        card.append(icon, content);

        return card;
    }

    function renderDashboard() {
        const query = searchBar.value.trim().toLocaleLowerCase();
        const selectedCategory = categoryFilter.value;

        const filteredSites = websitesArray.filter(site => {
            const searchableText = [
                site.name,
                site.description || "",
                site.category || ""
            ].join(" ").toLocaleLowerCase();

            return searchableText.includes(query) &&
                (selectedCategory === "all" || site.category === selectedCategory);
        });

        gridContainer.replaceChildren();
        filteredSites.forEach(site => {
            gridContainer.appendChild(createWebsiteCard(site));
        });

        const count = filteredSites.length;
        const hasFilters = Boolean(query) || selectedCategory !== "all";

        resultsCount.textContent =
            `${count} ${count === 1 ? "website" : "websites"}${hasFilters ? " found" : " available"}`;

        emptyState.hidden = count !== 0;
        gridContainer.hidden = count === 0;
        clearSearchBtn.hidden = searchBar.value.length === 0;
    }

    function resetFilters() {
        searchBar.value = "";
        categoryFilter.value = "all";
        renderDashboard();
        searchBar.focus();
    }

    searchBar.addEventListener("input", renderDashboard);
    categoryFilter.addEventListener("change", renderDashboard);

    clearSearchBtn.addEventListener("click", () => {
        searchBar.value = "";
        renderDashboard();
        searchBar.focus();
    });

    resetFiltersBtn.addEventListener("click", resetFilters);

    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.dataset.theme || "light";
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });

    document.getElementById("current-year").textContent =
        String(new Date().getFullYear());

    populateCategories();
    applyTheme(
        safeGetTheme() || document.documentElement.dataset.theme || "light"
    );
    renderDashboard();
})();