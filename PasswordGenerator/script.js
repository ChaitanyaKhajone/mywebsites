const themeToggleBtn = document.getElementById("theme-toggle");
const passwordDisplay = document.getElementById("password-display");
const lengthSlider = document.getElementById("length-slider");
const lengthVal = document.getElementById("length-val");
const uppercaseCb = document.getElementById("uppercase");
const lowercaseCb = document.getElementById("lowercase");
const numbersCb = document.getElementById("numbers");
const symbolsCb = document.getElementById("symbols");
const excludeAmbiguousCb = document.getElementById("exclude-ambiguous");
const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");
const strengthText = document.getElementById("strength-text");
const strengthFill = document.getElementById("strength-fill");
const charPools = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
};
const ambiguousChars = /[1lI0O8B5S9g]/g;
const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeToggleBtn.innerText = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
};
themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
});
lengthSlider.addEventListener("input", (e) => {
    lengthVal.innerText = e.target.value;
});
function calculateStrength(password, poolSize) {
    if (!password || poolSize === 0)
        return { text: "Too Short", width: "0%", color: "#e0e0e0" };
    const length = password.length;
    const entropy = length * Math.log2(poolSize);
    if (entropy < 40 || length < 8)
        return { text: "Weak 🔴", width: "25%", color: "#e74c3c" };
    else if (entropy < 60 || length < 12)
        return { text: "Medium 🟡", width: "50%", color: "#f39c12" };
    else if (entropy < 80)
        return { text: "Strong 🟢", width: "75%", color: "#2ecc71" };
    else
        return { text: "Very Strong 🔥", width: "100%", color: "#1abc9c" };
}
function updateStrengthDOM(strength) {
    strengthText.innerText = strength.text;
    strengthFill.style.width = strength.width;
    strengthFill.style.backgroundColor = strength.color;
}
function generatePassword() {
    const length = parseInt(lengthSlider.value);
    let allowedChars = "";
    let guaranteedChars = [];
    const activePools = [];
    if (uppercaseCb.checked)
	activePools.push(charPools.uppercase);
    if (lowercaseCb.checked)
	activePools.push(charPools.lowercase);
    if (numbersCb.checked)
	activePools.push(charPools.numbers);
    if (symbolsCb.checked)
	activePools.push(charPools.symbols);
    for (let i = 0; i < activePools.length; i++) {
        let pool = activePools[i];
        if (excludeAmbiguousCb.checked)
            pool = pool.replace(ambiguousChars, "");
        if (pool.length > 0) {
            allowedChars += pool;
            const randomIndex = Math.floor(Math.random() * pool.length);
            guaranteedChars.push(pool[randomIndex]);
        }
    }
    if (allowedChars === "") {
        passwordDisplay.value = "Select options/character sets";
        updateStrengthDOM({ text: "Empty", width: "0%", color: "#e0e0e0" });
        return;
    }
    let passwordArray = [...guaranteedChars];
    const remainingLength = length - passwordArray.length;
    for (let i = 0; i < remainingLength; i++) {
        const randomIndex = Math.floor(Math.random() * allowedChars.length);
        passwordArray.push(allowedChars[randomIndex]);
    }
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    const generatedPassword = passwordArray.join("");
    passwordDisplay.value = generatedPassword;
    const strength = calculateStrength(generatedPassword, allowedChars.length);
    updateStrengthDOM(strength);
}
async function copyToClipboard() {
    const password = passwordDisplay.value;
    if (!password || password.startsWith("Select"))
        return;
    try {
        await navigator.clipboard.writeText(password);
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => {
            copyBtn.innerText = originalText;
        }, 1500);
    } catch (err) {
        console.error("Copy failed: ", err);
    }
}
generateBtn.addEventListener("click", generatePassword);
copyBtn.addEventListener("click", copyToClipboard);
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    applyTheme(savedTheme || "light");
});