"use strict";

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
const strengthBar = document.getElementById("strength-bar");
const statusMessage = document.getElementById("status-message");

const charPools = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
};

const ambiguousChars = new Set("1lI0O8B5S9g");
const MIN_LENGTH = Number(lengthSlider.min);
const MAX_LENGTH = Number(lengthSlider.max);
const UINT32_RANGE = 0x100000000;

function secureRandomInt(max) {
    if (!Number.isSafeInteger(max) || max < 1 || max > UINT32_RANGE) {
        throw new RangeError("Random range is invalid.");
    }

    const limit = UINT32_RANGE - (UINT32_RANGE % max);
    const values = new Uint32Array(1);

    do {
        window.crypto.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % max;
}

function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selectedTheme;
    themeToggleBtn.textContent = selectedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
    themeToggleBtn.setAttribute(
        "aria-label",
        `Switch to ${selectedTheme === "dark" ? "light" : "dark"} mode`
    );

    try {
        localStorage.setItem("theme", selectedTheme);
    } catch {
        // Theme switching still works when storage is unavailable.
    }
}

function loadTheme() {
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem("theme");
    } catch {
        // Use the system preference when storage is unavailable.
    }

    if (savedTheme !== "light" && savedTheme !== "dark") {
        savedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    applyTheme(savedTheme);
}

function getActivePools() {
    const selectedPools = [];

    if (uppercaseCb.checked) selectedPools.push(charPools.uppercase);
    if (lowercaseCb.checked) selectedPools.push(charPools.lowercase);
    if (numbersCb.checked) selectedPools.push(charPools.numbers);
    if (symbolsCb.checked) selectedPools.push(charPools.symbols);

    return selectedPools
        .map((pool) => {
            if (!excludeAmbiguousCb.checked) return pool;
            return [...pool].filter((char) => !ambiguousChars.has(char)).join("");
        })
        .filter((pool) => pool.length > 0);
}

function shuffleSecurely(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = secureRandomInt(i + 1);
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}

function calculateStrength(length, poolSize) {
    if (!length || !poolSize) {
        return { text: "Not available", width: 0, level: 0 };
    }

    const entropy = length * Math.log2(poolSize);

    if (entropy < 40 || length < 8) return { text: "Weak", width: 25, level: 25 };
    if (entropy < 60 || length < 12) return { text: "Medium", width: 50, level: 50 };
    if (entropy < 80) return { text: "Strong", width: 75, level: 75 };
    return { text: "Very strong", width: 100, level: 100 };
}

function updateStrength(length, poolSize) {
    const strength = calculateStrength(length, poolSize);

    strengthText.textContent = strength.text;
    strengthFill.style.width = `${strength.width}%`;
    strengthFill.dataset.level = String(strength.level);
    strengthBar.setAttribute("aria-valuenow", String(strength.level));
    strengthBar.setAttribute("aria-valuetext", strength.text);
}

function generatePassword() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
        passwordDisplay.value = "";
        updateStrength(0, 0);
        statusMessage.textContent =
            "Secure password generation is not supported in this browser context. Use a modern browser over HTTPS or localhost.";
        return;
    }

    const length = Number(lengthSlider.value);
    if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
        statusMessage.textContent = `Choose a password length between ${MIN_LENGTH} and ${MAX_LENGTH}.`;
        return;
    }

    const activePools = getActivePools();

    if (activePools.length === 0) {
        passwordDisplay.value = "";
        updateStrength(0, 0);
        statusMessage.textContent = "Select at least one character type with available characters.";
        return;
    }

    try {
        const allowedChars = activePools.join("");
        const passwordChars = activePools.map((pool) => pool[secureRandomInt(pool.length)]);

        while (passwordChars.length < length) {
            passwordChars.push(allowedChars[secureRandomInt(allowedChars.length)]);
        }

        passwordDisplay.value = shuffleSecurely(passwordChars).join("");
        updateStrength(length, allowedChars.length);
        statusMessage.textContent = "A new password has been generated.";
        copyBtn.textContent = "Copy";
    } catch {
        passwordDisplay.value = "";
        updateStrength(0, 0);
        statusMessage.textContent = "Password generation failed. Try again in a secure browser context.";
    }
}

async function copyToClipboard() {
    const password = passwordDisplay.value;

    if (!password) {
        statusMessage.textContent = "Generate a password before copying.";
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(password);
        } else {
            passwordDisplay.focus();
            passwordDisplay.select();
            const copied = document.execCommand("copy");
            passwordDisplay.setSelectionRange(0, 0);

            if (!copied) throw new Error("Clipboard copy was not available.");
        }

        copyBtn.textContent = "Copied!";
        statusMessage.textContent = "Password copied to clipboard.";
        window.setTimeout(() => {
            copyBtn.textContent = "Copy";
        }, 1500);
    } catch {
        passwordDisplay.focus();
        passwordDisplay.select();
        statusMessage.textContent =
            "Could not copy automatically. The password is selected so you can copy it manually.";
    }
}

themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme;
    applyTheme(currentTheme === "dark" ? "light" : "dark");
});

lengthSlider.addEventListener("input", () => {
    lengthVal.value = lengthSlider.value;
    lengthVal.textContent = lengthSlider.value;
});

generateBtn.addEventListener("click", generatePassword);
copyBtn.addEventListener("click", copyToClipboard);

loadTheme();
lengthVal.value = lengthSlider.value;
lengthVal.textContent = lengthSlider.value;
