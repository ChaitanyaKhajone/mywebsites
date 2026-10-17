document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const calculateBtn = document.getElementById('calculateBtn');
    const dobInput = document.getElementById('dob');
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

    let countdownInterval = null;

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.textContent = '🌙 Dark Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '☀️ Light Mode';
        }
    });

    calculateBtn.addEventListener('click', () => {
        const dobValue = dobInput.value;
        if (!dobValue) {
            alert('Please select a valid date of birth.');
            return;
        }

        const dob = new Date(dobValue);
        const today = new Date();
        
        today.setHours(0, 0, 0, 0);
        dob.setHours(0, 0, 0, 0);

        if (dob > today) {
            alert('Date of birth cannot be in the future.');
            return;
        }

        clearInterval(countdownInterval);
        resultsSection.classList.remove('hidden');

        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        birthDayOfWeekEl.textContent = weekdays[dob.getDay()];

        let years = today.getFullYear() - dob.getFullYear();
        let months = today.getMonth() - dob.getMonth();
        let days = today.getDate() - dob.getDate();

        if (days < 0) {
            months--;
            const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += previousMonth.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        exactAgeEl.textContent = `${years} Years, ${months} Months, ${days} Days`;

        const diffTime = Math.abs(today - dob);
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const totalMonths = (years * 12) + months; 

        totalDaysEl.textContent = totalDays.toLocaleString();
        totalMonthsEl.textContent = totalMonths.toLocaleString();

        let nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        nextBirthdayDayEl.textContent = weekdays[nextBirthday.getDay()];

        const timeDiff = nextBirthday.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        wishBanner.classList.add('hidden');
        if (daysLeft === 365 || (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate())) {
            wishBanner.textContent = '🎂 Happy Birthday! Have a wonderful day ahead! 🎉';
            wishBanner.classList.remove('hidden');
        } else if (daysLeft === 1) {
            wishBanner.textContent = '🎈 Tomorrow is your Birthday! Advanced Wishes! ✨';
            wishBanner.classList.remove('hidden');
        } else if (daysLeft === 2) {
            wishBanner.textContent = '🎁 Just 2 days left for your special day! 🥳';
            wishBanner.classList.remove('hidden');
        } else if (daysLeft === 3) {
            wishBanner.textContent = '🌟 3 days remaining until your Birthday! ⚡';
            wishBanner.classList.remove('hidden');
        }

        milestonesList.innerHTML = '';
        
        const currentMilestoneYear = Math.ceil((years + 1) / 10) * 10;
        const yearMilestones = [currentMilestoneYear, currentMilestoneYear + 5, currentMilestoneYear + 10];
        
        yearMilestones.forEach(yr => {
            const milestoneDate = new Date(dob.getFullYear() + yr, dob.getMonth(), dob.getDate());
            const msDiff = milestoneDate.getTime() - today.getTime();
            const msDaysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
            
            const li = document.createElement('li');
            li.innerHTML = `Turning ${yr} Years Old <span>In ${msDaysLeft.toLocaleString()} days</span>`;
            milestonesList.appendChild(li);
        });

        const currentMilestoneDay = Math.ceil((totalDays + 1) / 1000) * 1000;
        const dayMilestones = [currentMilestoneDay, currentMilestoneDay + 500, currentMilestoneDay + 1000];
        
        dayMilestones.forEach(dy => {
            const msDaysLeft = dy - totalDays;
            const li = document.createElement('li');
            li.innerHTML = `Reaching ${dy.toLocaleString()} Days Alive <span>In ${msDaysLeft.toLocaleString()} days</span>`;
            milestonesList.appendChild(li);
        });

        const targetTime = new Date(nextBirthday.getFullYear(), nextBirthday.getMonth(), nextBirthday.getDate(), 0, 0, 0).getTime();

        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetTime - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                cdDays.textContent = '00';
                cdHours.textContent = '00';
                cdMinutes.textContent = '00';
                cdSeconds.textContent = '00';
                return;
            }

            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);

            cdDays.textContent = String(d).padStart(2, '0');
            cdHours.textContent = String(h).padStart(2, '0');
            cdMinutes.textContent = String(m).padStart(2, '0');
            cdSeconds.textContent = String(s).padStart(2, '0');
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    });
});