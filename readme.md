# My Static Websites Dashboard

A responsive dashboard for showcasing static websites and small web tools in one place. It is built with HTML, CSS, and vanilla JavaScript, and can be hosted for free with GitHub Pages.

## Live Website

Visit the deployed dashboard: [My Static Websites Dashboard](https://chaitanyakhajone.github.io/mywebsites/)

## Features

- Search websites by name, description, or category.
- Filter websites by category.
- Switch between light and dark themes.
- Responsive layout for desktop, tablet, and mobile screens.
- Keep website details in a separate JavaScript data file.

## Project Structure

```text
mywebsites/
├── index.html
└── assets/
    ├── style.css
    ├── script.js
    └── websites.js
```

## How It Works

- **`index.html`** contains the dashboard structure and loads the CSS and JavaScript files.
- **`assets/style.css`** controls the layout, styling, responsive behavior, and light/dark themes.
- **`assets/websites.js`** contains the website data used to build the dashboard cards.
- **`assets/script.js`** renders the cards and handles search, category filters, theme switching, and other dashboard interactions.

### Add a Website

Add another object to `websitesArray` in `assets/websites.js`. Include the website's name, link, category, description, and icon. The dashboard uses this data to display the website card and update the available category filters.

## Deploy with GitHub Pages

1. Push `index.html` and the `assets/` folder to the root of your GitHub repository.
2. Open the repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose your deployment branch (for example, `main`) and the `/(root)` folder, then save.
5. Wait for GitHub Pages to finish deploying. Open the URL shown in the Pages settings to view the live website.

Keep the file paths in `index.html` consistent with your repository structure. If you move the project or change the repository URL, check the `BASE_URL` setting in `assets/script.js` and verify that each website link points to the correct destination.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub Pages

## Author

**Chaitanya Khajone**

- GitHub: [@chaitanyakhajone](https://github.com/chaitanyakhajone)
- Project website: [My Static Websites Dashboard](https://chaitanyakhajone.github.io/mywebsites/)
