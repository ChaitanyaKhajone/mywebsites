const ageForm = document.getElementById('ageForm');
const themeToggle = document.getElementById('themeToggle');
const dobInput = document.getElementById('dob');
const dobError = document.getElementById('dobError');
const resultsSection = document.getElementById('results');
const wishBanner = document.getElementById('wishBanner');
const exactAgeEl = document.getElementById('exactAge');
const totalMonthsEl = document.getElementById('totalMonths');
const totalDaysEl = document.getElementById('totalDays');
const birthDayOfWeekEl = document.getElementById('birthDayOfWeek');
const nextBirthdayDayEl = document.getElementById('nextBirthdayDay');
const milestonesList = document.getElementById('milestonesList');
const cdDays = document.getElementById('cdDays');
const cdHours = document.getElementById('cdHours');
const cdMinutes = document.getElementById('cdMinutes');
const cdSeconds = document.getElementById('cdSeconds');
const DAY_MS = 24 * 60 * 60 * 1000;
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let countdownInterval = null;
let selectedBirthDate = null;

const parseDateInput = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysBetween = (start, end) => Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / DAY_MS);

const getAge = (birthDate, today) => {
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return { years, months, days };
};

const getBirthdayForYear = (birthDate, year) => {
    const month = birthDate.getMonth();
    const day = birthDate.getDate();
    if (month === 1 && day === 29 && !isLeapYear(year)) return new Date(year, 1, 28);
    return new Date(year, month, day);
};

const isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const applyTheme = theme => {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    try {
        localStorage.setItem('theme', theme);
    } catch {}
};

let initialTheme = 'light';
try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') initialTheme = savedTheme;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) initialTheme = 'dark';
} catch {}
applyTheme(initialTheme);

themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

const currentDate = new Date();
dobInput.max = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

dobInput.addEventListener('input', () => {
    dobError.hidden = true;
    dobError.textContent = '';
    dobInput.removeAttribute('aria-invalid');
});

const setError = message => {
    dobError.textContent = message;
    dobError.hidden = false;
    dobInput.setAttribute('aria-invalid', 'true');
    dobInput.focus();
    resultsSection.hidden = true;
    wishBanner.hidden = true;
    clearInterval(countdownInterval);
};

const addMilestone = (label, daysRemaining) => {
    const item = document.createElement('li');
    const title = document.createElement('span');
    const time = document.createElement('strong');
    title.textContent = label;
    time.textContent = `In ${daysRemaining.toLocaleString()} days`;
    item.append(title, time);
    milestonesList.appendChild(item);
};

const updateCountdown = () => {
    if (!selectedBirthDate) return;
    const now = new Date();
    const today = startOfDay(now);
    let nextBirthday = getBirthdayForYear(selectedBirthDate, today.getFullYear());
    if (nextBirthday <= today) nextBirthday = getBirthdayForYear(selectedBirthDate, today.getFullYear() + 1);
    const target = new Date(nextBirthday.getFullYear(), nextBirthday.getMonth(), nextBirthday.getDate()).getTime();
    const distance = Math.max(0, target - now.getTime());
    cdDays.textContent = String(Math.floor(distance / DAY_MS)).padStart(2, '0');
    cdHours.textContent = String(Math.floor((distance % DAY_MS) / 3600000)).padStart(2, '0');
    cdMinutes.textContent = String(Math.floor((distance % 3600000) / 60000)).padStart(2, '0');
    cdSeconds.textContent = String(Math.floor((distance % 60000) / 1000)).padStart(2, '0');
};

ageForm.addEventListener('submit', event => {
    event.preventDefault();
    const birthDate = parseDateInput(dobInput.value);
    const today = startOfDay(new Date());

    if (!birthDate) {
        setError('Please select a valid date of birth.');
        return;
    }
    if (birthDate > today) {
        setError('Date of birth cannot be in the future.');
        return;
    }

    clearInterval(countdownInterval);
    selectedBirthDate = birthDate;
    const age = getAge(birthDate, today);
    const totalDays = daysBetween(birthDate, today);
    const totalMonths = age.years * 12 + age.months;
    const nextBirthday = getBirthdayForYear(birthDate, today.getFullYear()) > today
        ? getBirthdayForYear(birthDate, today.getFullYear())
        : getBirthdayForYear(birthDate, today.getFullYear() + 1);
    const daysUntilBirthday = daysBetween(today, nextBirthday);

    exactAgeEl.textContent = `${age.years} years, ${age.months} months, ${age.days} days`;
    totalMonthsEl.textContent = totalMonths.toLocaleString();
    totalDaysEl.textContent = totalDays.toLocaleString();
    birthDayOfWeekEl.textContent = weekdays[birthDate.getDay()];
    nextBirthdayDayEl.textContent = weekdays[nextBirthday.getDay()];

    wishBanner.hidden = true;
    if (birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()) {
        wishBanner.textContent = '🎂 Happy Birthday! Have a wonderful day ahead! 🎉';
        wishBanner.hidden = false;
    } else if (daysUntilBirthday === 1) {
        wishBanner.textContent = '🎈 Tomorrow is your birthday! Best wishes! ✨';
        wishBanner.hidden = false;
    } else if (daysUntilBirthday === 2) {
        wishBanner.textContent = '🎁 Just 2 days left for your special day! 🥳';
        wishBanner.hidden = false;
    } else if (daysUntilBirthday === 3) {
        wishBanner.textContent = '🌟 3 days remaining until your birthday! ⚡';
        wishBanner.hidden = false;
    }

    milestonesList.replaceChildren();

    const nextAgeMilestone = Math.ceil((age.years + 1) / 5) * 5;
    [nextAgeMilestone, nextAgeMilestone + 5, nextAgeMilestone + 10].forEach(years => {
        const milestoneDate = getBirthdayForYear(birthDate, birthDate.getFullYear() + years);
        addMilestone(`Turning ${years} years old`, Math.max(0, daysBetween(today, milestoneDate)));
    });

    const nextThousandDays = Math.ceil((totalDays + 1) / 1000) * 1000;
    [nextThousandDays, nextThousandDays + 500, nextThousandDays + 1000].forEach(days => {
        addMilestone(`Reaching ${days.toLocaleString()} days alive`, days - totalDays);
    });

    dobError.hidden = true;
    dobInput.removeAttribute('aria-invalid');
    resultsSection.hidden = false;
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
});