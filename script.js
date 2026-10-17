const BASE_URL = "https://chaitanyankhajone.github.io/mywebsites/";

const websitesArray = [
    { name: "DEMO 1", link: "demo" },
    { name: "DEMO 2", link: "demo" }
];

const gridContainer = document.getElementById("grid-container");
const themeToggleBtn = document.getElementById("theme-toggle");
const searchBar = document.getElementById("search-bar");

function renderDashboard(filterQuery = "") {
    gridContainer.innerHTML = "";

    const filteredSites = websitesArray.filter(site => 
        site.name.toLowerCase().includes(filterQuery.toLowerCase())
    );

    filteredSites.forEach(site => {
        const card = document.createElement("div");
        card.classList.add("site-card");
        card.innerText = site.name;

        card.addEventListener("click", () => {
            const finalDestination = `${BASE_URL}${site.link}`;
            setTimeout(() => {
                window.open(finalDestination, "_blank");
            }, 100); 
        });

        gridContainer.appendChild(card);
    });
}

searchBar.addEventListener("input", (e) => {
    renderDashboard(e.target.value);
});

themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    
    if (currentTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "light");
        themeToggleBtn.innerText = "🌙 Dark Mode";
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        themeToggleBtn.innerText = "☀️ Light Mode";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderDashboard();
});