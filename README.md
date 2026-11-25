# LearnHub – Online Learning Platform (Mini LMS)

**Live demo:** https://madhushaney14.github.io/learnhub/

LearnHub is a responsive, accessible learning platform where learners in Sri Lanka can browse and register for short professional courses across six subject areas: Web Development, Data Science & Analytics, UI/UX Design, Cyber Security, AI & Machine Learning, and Digital Marketing.

Built with plain **HTML5, CSS3, JavaScript and XML**, with no frameworks.

## Features

- **Dynamic course catalogue:** 48 courses stored in `courses.xml`, loaded with `XMLHttpRequest`, parsed with `DOMParser` and rendered with JavaScript
- **Search, filter and sort:** live search, subject filters and sorting by price, rating, date or popularity
- **Expandable lesson panels:** each course opens a panel of lessons with topics and learning outcomes
- **Hero carousel** on the homepage
- **Registration form validation:** custom JavaScript validation with regular expressions and a live password-strength indicator
- **Responsive layout:** the navigation collapses to a hamburger menu on screens narrower than 768px
- **Embedded Google Map** on the contact page

## Accessibility

- Meets **WCAG 2.1 AA** colour contrast: every text colour pair tested at 4.5:1 or higher with the WebAIM Contrast Checker
- **0 errors** in the WAVE accessibility tool
- Labelled form fields, `aria-describedby` error messages and `aria-live` regions so screen readers announce validation errors
- `aria-current` on the active page, descriptive `alt` text, and a logical heading structure

## Validation

All HTML pages pass the **W3C Markup Validation Service** with 0 errors and 0 warnings.

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Homepage with hero carousel and featured courses |
| `courses.html` | Course catalogue with search, filters and lesson panels |
| `register.html` | Student registration form with validation |
| `contact.html` | Contact details and embedded map |
| `style.css` | Single stylesheet with CSS custom properties |
| `script.js` | All interactivity and XML loading |
| `courses.xml` | Course and subject data |

## Run locally

The site loads `courses.xml` at runtime, so serve it over HTTP:

```bash
git clone https://github.com/madhushaney14/learnhub.git
cd learnhub
python3 -m http.server 8000
```

Then open http://localhost:8000.

---

Built by Madhushaney Mahadevan as coursework for the Web Technology module, BSc (Hons) AI & Data Science, Informatics Institute of Technology.
