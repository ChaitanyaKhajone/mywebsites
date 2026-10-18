const BASE_URL = "https://chaitanyakhajone.github.io/mywebsites/";
const websitesArray = [
    { name: "Advanced Age Calculator", link: "AdvancedAgeCalculator" }
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
const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeToggleBtn.innerText = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
};
themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
});
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    applyTheme(savedTheme || "light");
    renderDashboard();
});