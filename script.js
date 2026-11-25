"use strict";

/* XML Loading and Parsing */
var catalogData = { subjects: [], courses: [] };

function loadCatalogXML(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "courses.xml", true);

    /* Tell the browser to treat the response as XML text so responseText
       is always populated, even on file:// origins. */
    xhr.overrideMimeType("text/xml");

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        /* status 200 = served via HTTP, status 0 = loaded from file:// */
        if (xhr.status === 200 || xhr.status === 0) {

            /* Attempt 1: use the browser's auto-parsed XML document */
            var xmlDoc = xhr.responseXML;

            /* Attempt 2: if responseXML is null (common on file://),
               parse the raw text ourselves using DOMParser */
            if (!xmlDoc && xhr.responseText) {
                try {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");

                    /* DOMParser signals errors with a <parsererror> element
                       rather than throwing — check for it explicitly */
                    var parseErr = xmlDoc.getElementsByTagName("parsererror");
                    if (parseErr.length > 0) {
                        console.error("LearnHub: DOMParser found XML errors in courses.xml");
                        xmlDoc = null;
                    }
                } catch (e) {
                    console.error("LearnHub: DOMParser threw an exception:", e);
                    xmlDoc = null;
                }
            }

            if (xmlDoc) {
                catalogData = parseCatalog(xmlDoc);
                callback(catalogData);
            } else {
                console.error("LearnHub: Could not parse courses.xml");
                showXMLError();
            }

        } else {
            console.error("LearnHub: Failed to load courses.xml – HTTP status " + xhr.status);
            showXMLError();
        }
    };

    xhr.send();
}
function parseCatalog(xml) {
    var result = { subjects: [], courses: [] };

    /* Parse subjects */
    var subjectNodes = xml.getElementsByTagName("subject");
    for (var i = 0; i < subjectNodes.length; i++) {
        var sn = subjectNodes[i];
        result.subjects.push({
            id:    sn.getAttribute("id"),
            color: sn.getAttribute("color"),
            name:  sn.textContent.trim()
        });
    }
    function getText(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? el.textContent.trim() : "";
    }

    /* Parse courses */
    var courseNodes = xml.getElementsByTagName("course");
    for (var j = 0; j < courseNodes.length; j++) {
        var cn = courseNodes[j];

        /* Parse lessons */
        var lessonNodes = cn.getElementsByTagName("lesson");
        var lessons = [];
        for (var k = 0; k < lessonNodes.length; k++) {
            var ln = lessonNodes[k];

            /* Subtopics */
            var stNodes = ln.getElementsByTagName("subtopic");
            var subtopics = [];
            for (var s = 0; s < stNodes.length; s++) {
                subtopics.push(stNodes[s].textContent.trim());
            }

            /* Outcomes */
            var ocNodes = ln.getElementsByTagName("outcome");
            var outcomes = [];
            for (var o = 0; o < ocNodes.length; o++) {
                outcomes.push(ocNodes[o].textContent.trim());
            }

            lessons.push({
                order:    parseInt(ln.getAttribute("order"), 10),
                duration: ln.getAttribute("lessonDuration") || "",
                title:    getText(ln, "title"),
                subtopics: subtopics,
                outcomes:  outcomes
            });
        }

        result.courses.push({
            id:          cn.getAttribute("id"),
            subject:     cn.getAttribute("subject"),
            price:       parseInt(cn.getAttribute("price"), 10),
            rating:      parseFloat(cn.getAttribute("rating")),
            students:    parseInt(cn.getAttribute("students"), 10),
            date:        cn.getAttribute("date"),
            level:       cn.getAttribute("level"),
            duration:    cn.getAttribute("duration"),
            title:       getText(cn, "title"),
            description: getText(cn, "description"),
            lessons:     lessons
        });
    }

    return result;
}

function showXMLError() {
    var targets = ["featured-courses-grid", "trending-track", "courses-grid"];
    targets.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<p class="empty-msg" style="color:#EF4444;">&#9888; Could not load course data. Ensure courses.xml is in the same folder as the HTML files.</p>';
        }
    });
}

/* Star Rating */
function buildStars(rating) {
    var html = '<div class="stars" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) {
        if (rating >= i) {
            html += '<span class="star filled">&#9733;</span>';
        } else if (rating >= i - 0.5) {
            html += '<span class="star half">&#9733;</span>';
        } else {
            html += '<span class="star">&#9733;</span>';
        }
    }
    html += '</div>';
    return html;
}
/* Price formatting */
function formatPrice(price) {
    return "LKR " + price.toLocaleString();
}

/* Student formatting */
function formatStudents(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
    return String(n);
}

/* Hero Slider (index.html) */

var sliderState = { current: 0, total: 0, timer: null };

function initHeroSlider() {
    var track = document.getElementById("slides-track");
    var dotsContainer = document.getElementById("slider-dots");
    var prevBtn = document.getElementById("slider-prev");
    var nextBtn = document.getElementById("slider-next");
    if (!track) return;

    sliderState.total = track.children.length;

    /* Build dots */
    dotsContainer.innerHTML = "";
    for (var i = 0; i < sliderState.total; i++) {
        var dot = document.createElement("button");
        dot.className = "dot" + (i === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.dataset.idx = i;
        dot.addEventListener("click", function () {
            goToSlide(parseInt(this.dataset.idx, 10));
        });
        dotsContainer.appendChild(dot);
    }

    /* Arrow controls */
    if (prevBtn) prevBtn.addEventListener("click", function () { goToSlide(sliderState.current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goToSlide(sliderState.current + 1); });

    startSliderTimer();
}

function goToSlide(idx) {
    idx = ((idx % sliderState.total) + sliderState.total) % sliderState.total;
    sliderState.current = idx;
    var track = document.getElementById("slides-track");
    if (track) track.style.transform = "translateX(-" + (idx * 100) + "%)";
    var dots = document.querySelectorAll(".dot");
    dots.forEach(function (d, i) { d.classList.toggle("active", i === idx); });
}

function startSliderTimer() {
    stopSliderTimer();
    sliderState.timer = setInterval(function () {
        goToSlide(sliderState.current + 1);
    }, 3500); /* 3.5 second interval */
}

function stopSliderTimer() {
    if (sliderState.timer) clearInterval(sliderState.timer);
}

/* Trending Course Carousel (index.html) */

var carouselState = { offset: 0 };
var CARD_W = 340; /* card width (320px) + gap (20px) */

function renderTrendingCarousel(courses) {
    var track = document.getElementById("trending-track");
    var prevBtn = document.getElementById("cp-prev");
    var nextBtn = document.getElementById("cp-next");
    if (!track) return;

    /* Sort by rating desc, pick top 10 */
    var sorted = courses.slice().sort(function (a, b) { return b.rating - a.rating; });
    var topCourses = sorted.slice(0, 10);

    track.innerHTML = "";

    topCourses.forEach(function (course) {
        var subjectInfo = catalogData.subjects.find(function (s) { return s.id === course.subject; }) || {};
        var card = document.createElement("article");
        card.className = "trend-card";
        card.setAttribute("aria-label", "Trending: " + course.title);
        card.style.setProperty("--subject-color", subjectInfo.color || "#6D28D9");
        card.innerHTML =
            '<span class="trend-badge">&#128293; Trending</span>' +
            '<h3 style="font-size:0.93rem;font-weight:700;color:var(--clr-text);line-height:1.4;">' + course.title + '</h3>' +
            '<div class="card-rating">' + buildStars(course.rating) +
            '  <span class="rating-num">' + course.rating.toFixed(1) + '</span>' +
            '  <span class="rating-count">(' + formatStudents(course.students) + ')</span>' +
            '</div>' +
            '<div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--clr-border);display:flex;align-items:center;justify-content:space-between;">' +
            '  <span style="font-size:1rem;font-weight:800;color:var(--clr-text);">' + formatPrice(course.price) + '</span>' +
            '  <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#374151;">' + (subjectInfo.name || course.subject) + '</span>' +
            '</div>';
        card.addEventListener("click", function () {
            window.location.href = "courses.html?course=" + course.id;
        });
        track.appendChild(card);
    });

    /* Arrow controls */
    var maxOffset = Math.max(0, (topCourses.length * CARD_W) - (track.parentElement.offsetWidth || 800));

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            carouselState.offset = Math.max(0, carouselState.offset - CARD_W * 3);
            track.style.transform = "translateX(-" + carouselState.offset + "px)";
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            carouselState.offset = Math.min(maxOffset, carouselState.offset + CARD_W * 3);
            track.style.transform = "translateX(-" + carouselState.offset + "px)";
        });
    }
}

/* Featured Courses Grid (index.html) */

function renderFeaturedCourses(courses) {
    var grid = document.getElementById("featured-courses-grid");
    if (!grid) return;
    grid.innerHTML = "";

    var featured = [];
    var subjectsSeen = {};
    courses.forEach(function (c) {
        if (!subjectsSeen[c.subject]) subjectsSeen[c.subject] = 0;
        if (subjectsSeen[c.subject] < 2 && featured.length < 8) {
            featured.push(c);
            subjectsSeen[c.subject]++;
        }
    });
    if (featured.length < 8) {
        courses.forEach(function (c) {
            if (featured.length < 8 && featured.indexOf(c) === -1) featured.push(c);
        });
    }

    featured.slice(0, 8).forEach(function (course) {
        grid.appendChild(buildCourseCard(course, "courses.html?course=" + course.id));
    });
}

/* Courses Page */

var currentSubject = "all";
var currentSearch  = "";
var currentSort    = "popular";

function initCoursesPage(catalog) {
    buildSidebar(catalog.subjects, catalog.courses);
    filterAndRender();

    /* Search input */
    var searchInput = document.getElementById("course-search");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentSearch = this.value.trim().toLowerCase();
            filterAndRender();
        });
    }

    /* Sort selector */
    var sortSel = document.getElementById("sort-select");
    if (sortSel) {
        sortSel.addEventListener("change", function () {
            currentSort = this.value;
            filterAndRender();
        });
    }

    /* Pre-select from URL */
    var params = new URLSearchParams(window.location.search);
    var preSubject = params.get("subject");
    var preCourse  = params.get("course");

    if (preSubject) {
        currentSubject = preSubject;
        var btn = document.querySelector('[data-subject="' + preSubject + '"]');
        if (btn) setActiveSubject(btn);
        filterAndRender();
    }

    if (preCourse) {
        setTimeout(function () { showCoursePanel(preCourse); }, 300);
    }
}

/* Sidebar */
function buildSidebar(subjects, courses) {
    var nav = document.getElementById("sidebar-nav");
    if (!nav) return;
    nav.innerHTML = "";

    /* Count courses per subject */
    var counts = {};
    courses.forEach(function (c) {
        counts[c.subject] = (counts[c.subject] || 0) + 1;
    });

    /* All Courses button */
    var allBtn = document.createElement("button");
    allBtn.className = "sidebar-btn active";
    allBtn.dataset.subject = "all";
    allBtn.innerHTML =
        '<span class="btn-left"><span class="dot-clr" style="background:#6D28D9;"></span>All Courses</span>' +
        '<span class="sidebar-count">' + courses.length + '</span>';
    allBtn.addEventListener("click", function () {
        currentSubject = "all";
        setActiveSubject(this);
        filterAndRender();
        hideLessonPanel();
    });
    nav.appendChild(allBtn);

    /* Subject buttons */
    subjects.forEach(function (sub) {
        var btn = document.createElement("button");
        btn.className = "sidebar-btn";
        btn.dataset.subject = sub.id;
        btn.innerHTML =
            '<span class="btn-left"><span class="dot-clr" style="background:' + sub.color + ';"></span>' + sub.name + '</span>' +
            '<span class="sidebar-count">' + (counts[sub.id] || 0) + '</span>';
        btn.addEventListener("click", function () {
            currentSubject = sub.id;
            setActiveSubject(this);
            filterAndRender();
            hideLessonPanel();
        });
        nav.appendChild(btn);
    });
}

function setActiveSubject(activeBtn) {
    document.querySelectorAll(".sidebar-btn").forEach(function (b) { b.classList.remove("active"); });
    activeBtn.classList.add("active");
}

function hideLessonPanel() {
    var panel = document.getElementById("lesson-panel");
    if (panel) panel.style.display = "none";
    var toolbar = document.querySelector(".courses-toolbar");
    if (toolbar) toolbar.scrollIntoView({ behavior: "smooth", block: "start" });
}

function filterAndRender() {
    var courses = catalogData.courses;

    /* 1. Filter by subject */
    if (currentSubject !== "all") {
        courses = courses.filter(function (c) { return c.subject === currentSubject; });
    }

    /* 2. Filter by search term (title + description) */
    if (currentSearch) {
        courses = courses.filter(function (c) {
            return c.title.toLowerCase().indexOf(currentSearch) !== -1 ||
                   c.description.toLowerCase().indexOf(currentSearch) !== -1;
        });
    }

    /* 3. Sort */
    courses = courses.slice().sort(function (a, b) {
        switch (currentSort) {
            case "price-asc":   return a.price - b.price;
            case "price-desc":  return b.price - a.price;
            case "rating":      return b.rating - a.rating;
            case "newest":      return new Date(b.date) - new Date(a.date);
            default:            return b.students - a.students; /* popular */
        }
    });

    renderCoursesGrid(courses);

    /* Update count display */
    var countEl = document.getElementById("courses-count");
    if (countEl) {
        countEl.innerHTML = 'Showing <span>' + courses.length + '</span> course' + (courses.length !== 1 ? 's' : '');
    }
}

function renderCoursesGrid(courses) {
    var grid = document.getElementById("courses-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (courses.length === 0) {
        grid.innerHTML = '<div class="no-results"><h3>No courses found</h3><p>Try a different search term or select another category.</p></div>';
        return;
    }

    courses.forEach(function (course) {
        grid.appendChild(buildCourseCard(course, null, true));
    });
}

/* Build Course Card */

function buildCourseCard(course, href, hasPanelClick) {
    var subjectInfo = catalogData.subjects.find(function (s) { return s.id === course.subject; }) || {};
    var color = subjectInfo.color || "#1F2937";
    var subName = subjectInfo.name || course.subject;

    var card = document.createElement("article");
    card.className = "course-card";
    card.setAttribute("aria-label", course.title);
    card.style.setProperty("--subject-color", color);

    card.innerHTML =
        '<div class="card-thumb"></div>' +
        '<div class="card-body">' +
        '  <div class="card-meta-top">' +
        '    <span class="card-subject">' + subName + '</span>' +
        '    <span class="card-level">' + course.level + '</span>' +
        '  </div>' +
        '  <h3 class="card-title">' + course.title + '</h3>' +
        '  <p class="card-desc">' + course.description + '</p>' +
        '  <div class="card-rating">' +
        buildStars(course.rating) +
        '    <span class="rating-num">' + course.rating.toFixed(1) + '</span>' +
        '    <span class="rating-count">(' + formatStudents(course.students) + ' students)</span>' +
        '  </div>' +
        '  <div class="card-footer">' +
        '    <div><div class="card-price">' + formatPrice(course.price) + '</div>' +
        '      <div style="font-size:0.75rem;color:var(--clr-text-muted);margin-top:2px;">' + course.duration + '</div>' +
        '    </div>' +
        '    <button class="card-enrol">View Course</button>' +
        '  </div>' +
        '</div>';

    if (hasPanelClick) {
        card.addEventListener("click", function () { showCoursePanel(course.id); });
    } else if (href) {
        card.addEventListener("click", function () { window.location.href = href; });
    }

    return card;
}

/* Course Detail Panel (courses.html)*/

function showCoursePanel(courseId) {
    var panel = document.getElementById("lesson-panel");
    if (!panel) return;

    var course = catalogData.courses.find(function (c) { return c.id === courseId; });
    if (!course) {
        panel.innerHTML = '<p class="loading-msg" style="color:#EF4444;">Course not found.</p>';
        return;
    }

    var subjectInfo = catalogData.subjects.find(function (s) { return s.id === course.subject; }) || {};
    var color = subjectInfo.color || "#1F2937";

    /* Build lessons HTML */
    var lessonsHTML = "";
    course.lessons.forEach(function (lesson) {
        var subtopicsHTML = lesson.subtopics.map(function (st) {
            return '<li>' + st + '</li>';
        }).join("");
        var outcomesHTML = lesson.outcomes.map(function (oc) {
            return '<li>' + oc + '</li>';
        }).join("");
        var detailHTML = "";
        if (subtopicsHTML) {
            detailHTML += '<h4>What you\'ll cover</h4><ul>' + subtopicsHTML + '</ul>';
        }
        if (outcomesHTML) {
            detailHTML += '<h4>Learning outcomes</h4><ul>' + outcomesHTML + '</ul>';
        }

        lessonsHTML +=
            '<div class="lesson-item">' +
            '  <button class="lesson-trigger" aria-expanded="false" aria-controls="lesson-detail-' + lesson.order + '">' +
            '    <span class="lesson-num">' + lesson.order + '</span>' +
            '    <span class="lesson-title-group">' +
            '      <span class="lesson-name">' + lesson.title + '</span>' +
            '      <span class="lesson-dur">' + (lesson.duration || "–") + '</span>' +
            '    </span>' +
            '    <span class="lesson-chevron" aria-hidden="true">&#8964;</span>' +
            '  </button>' +
            '  <div class="lesson-detail" id="lesson-detail-' + lesson.order + '" role="region" aria-label="Details for ' + lesson.title + '">' +
                detailHTML +
            '  </div>' +
            '</div>';
    });

    /* Render panel */
    panel.style.display = "block";
    panel.innerHTML =
        '<div class="lesson-panel-header" style="background:linear-gradient(135deg,' + color + 'cc 0%,' + color + ' 100%);">' +
        '  <span class="panel-badge">' + (subjectInfo.name || course.subject) + '</span>' +
        '  <h2>' + course.title + '</h2>' +
        '  <p>' + course.description + '</p>' +
        '</div>' +
        '<div class="panel-meta">' +
        '  <div class="meta-item">Duration: <strong>' + course.duration + '</strong></div>' +
        '  <div class="meta-item">Lessons: <strong>' + course.lessons.length + '</strong></div>' +
        '  <div class="meta-item">Level: <strong>' + course.level + '</strong></div>' +
        '  <div class="meta-item">Rating: <strong>' + course.rating.toFixed(1) + ' / 5</strong></div>' +
        '  <div class="meta-item">Students: <strong>' + formatStudents(course.students) + '</strong></div>' +
        '</div>' +
        '<div class="lessons-list-section">' +
        '  <h3>Course Lessons <span style="font-size:0.82rem;font-weight:500;color:var(--clr-text-muted);">(click a lesson to expand)</span></h3>' +
            lessonsHTML +
        '</div>' +
        '<div class="panel-enrol-wrap">' +
        '  <div>' +
        '    <div class="panel-price-lbl">Course Price</div>' +
        '    <div class="panel-price-big">' + formatPrice(course.price) + '</div>' +
        '  </div>' +
        '  <a href="register.html" class="btn-primary">Enrol Now &#8594;</a>' +
        '</div>';

    /* Attach lesson toggle listeners */
    panel.querySelectorAll(".lesson-trigger").forEach(function (trigger) {
        trigger.addEventListener("click", function () {
            toggleLesson(this.closest(".lesson-item"));
        });
    });

    /* Scroll into view after selection */
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleLesson(item) {
    var isOpen = item.classList.contains("open");
    /* Close all others */
    document.querySelectorAll(".lesson-item.open").forEach(function (el) {
        el.classList.remove("open");
        el.querySelector(".lesson-trigger").setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
        item.classList.add("open");
        item.querySelector(".lesson-trigger").setAttribute("aria-expanded", "true");
    }
}

/* Register Form Validation */

function initRegisterForm() {
    var form = document.getElementById("registration-form");
    if (!form) return;

    /* Live password check */
    var pwInput = document.getElementById("password");
    if (pwInput) {
        pwInput.addEventListener("input", function () {
            checkPasswordCriteria(this.value);
        });
    }

    /* On-submit validation */
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (validateRegisterForm()) {
            showSuccessMsg("success-banner");
        }
    });
}

function checkPasswordCriteria(pw) {
    var criteria = {
        "cr-length":    pw.length >= 8,
        "cr-upper":     /[A-Z]/.test(pw),
        "cr-lower":     /[a-z]/.test(pw),
        "cr-number":    /[0-9]/.test(pw)
    };
    Object.keys(criteria).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.classList.toggle("met", criteria[id]);
            var icon = el.querySelector(".cr-icon");
            if (icon) icon.innerHTML = criteria[id] ? "&#10003;" : "";
        }
    });
}

function validateRegisterForm() {
    clearFormErrors("registration-form");
    var isValid = true;
    var firstErrorEl = null;

    /* ---- 1. Full Name ---- */
    var nameInput = document.getElementById("fullName");
    var name = nameInput ? nameInput.value.trim() : "";
    if (name === "") {
        showFieldError(nameInput, "err-fullName", "Full name is required.");
        if (!firstErrorEl) firstErrorEl = nameInput;
        isValid = false;
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
        /* Only letters and spaces allowed */
        showFieldError(nameInput, "err-fullName", "Full name must contain letters only — no numbers or symbols.");
        if (!firstErrorEl) firstErrorEl = nameInput;
        isValid = false;
    } else if (name.replace(/\s/g, "").length < 2) {
        showFieldError(nameInput, "err-fullName", "Full name must be at least 2 characters long.");
        if (!firstErrorEl) firstErrorEl = nameInput;
        isValid = false;
    }

    /* ---- 2. Email ---- */
    var emailInput = document.getElementById("email");
    var email = emailInput ? emailInput.value.trim() : "";
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email === "") {
        showFieldError(emailInput, "err-email", "Email address is required.");
        if (!firstErrorEl) firstErrorEl = emailInput;
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showFieldError(emailInput, "err-email", "Please enter a valid email address (e.g. name@example.com).");
        if (!firstErrorEl) firstErrorEl = emailInput;
        isValid = false;
    }

    /* ---- 3. Password ---- */
    var pwInput   = document.getElementById("password");
    var pw        = pwInput ? pwInput.value : "";
    var pwErrors  = [];
    if (pw === "") {
        pwErrors.push("Password is required.");
    } else {
        if (pw.length < 8)          pwErrors.push("at least 8 characters");
        if (!/[A-Z]/.test(pw))      pwErrors.push("an uppercase letter");
        if (!/[a-z]/.test(pw))      pwErrors.push("a lowercase letter");
        if (!/[0-9]/.test(pw))      pwErrors.push("a number");
    }
    if (pwErrors.length > 0) {
        var pwMsg = pwErrors.length === 1 && pwErrors[0] === "Password is required."
            ? "Password is required."
            : "Password must include: " + pwErrors.join(", ") + ".";
        showFieldError(pwInput, "err-password", pwMsg);
        if (!firstErrorEl) firstErrorEl = pwInput;
        isValid = false;
    }

    /* Scroll to first error in the form*/
    if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorEl.focus();
    }

    return isValid;
}

function showFieldError(input, errId, message) {
    if (input) input.classList.add("has-error");
    var errEl = document.getElementById(errId);
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = "block";
    }
}

function clearFormErrors(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll(".form-control").forEach(function (el) {
        el.classList.remove("has-error");
    });
    form.querySelectorAll(".err-msg").forEach(function (el) {
        el.style.display = "none";
        el.textContent = "";
    });
    var banner = form.querySelector(".success-banner");
    if (banner) banner.style.display = "none";
}

function showSuccessMsg(id) {
    var el = document.getElementById(id);
    if (el) {
        el.style.display = "block";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/* Contact Form Validation */

function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearFormErrors("contact-form");
        var isValid = true;
        var firstErr = null;

        /* Enquiry name */
        var nameEl = document.getElementById("enquiry-name");
        var nameVal = nameEl ? nameEl.value.trim() : "";
        if (!nameVal) {
            showFieldError(nameEl, "err-enquiry-name", "Your name is required.");
            if (!firstErr) firstErr = nameEl;
            isValid = false;
        } else if (!/^[A-Za-z\s]+$/.test(nameVal)) {
            showFieldError(nameEl, "err-enquiry-name", "Name must contain letters only.");
            if (!firstErr) firstErr = nameEl;
            isValid = false;
        }

        /* Enquiry email */
        var emailEl  = document.getElementById("enquiry-email");
        var emailVal = emailEl ? emailEl.value.trim() : "";
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailVal) {
            showFieldError(emailEl, "err-enquiry-email", "Email address is required.");
            if (!firstErr) firstErr = emailEl;
            isValid = false;
        } else if (!re.test(emailVal)) {
            showFieldError(emailEl, "err-enquiry-email", "Please enter a valid email address.");
            if (!firstErr) firstErr = emailEl;
            isValid = false;
        }

        /* Enquiry message */
        var msgEl  = document.getElementById("enquiry-message");
        var msgVal = msgEl ? msgEl.value.trim() : "";
        if (!msgVal || msgVal.length < 10) {
            showFieldError(msgEl, "err-enquiry-message", "Please enter a message (at least 10 characters).");
            if (!firstErr) firstErr = msgEl;
            isValid = false;
        }

        if (firstErr) {
            firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
            firstErr.focus();
        }
        if (isValid) showSuccessMsg("contact-success");
    });
}

/* Mobile Navigation */

function initMobileNav() {
    var hamburger = document.getElementById("hamburger");
    var mainNav   = document.getElementById("main-nav");
    var overlay   = document.getElementById("mobile-overlay");
    if (!hamburger || !mainNav) return;

    function openNav() {
        hamburger.classList.add("open");
        mainNav.classList.add("open");
        hamburger.setAttribute("aria-expanded", "true");
        if (overlay) overlay.classList.add("visible");
        document.body.style.overflow = "hidden";
    }
    function closeNav() {
        hamburger.classList.remove("open");
        mainNav.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        if (overlay) overlay.classList.remove("visible");
        document.body.style.overflow = "";
    }

    hamburger.addEventListener("click", function () {
        if (mainNav.classList.contains("open")) closeNav(); else openNav();
    });
    if (overlay) overlay.addEventListener("click", closeNav);

    /* Close nav when a link is clicked */
    mainNav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeNav);
    });
}

/* Active nav link highlighting */
function highlightActiveNav() {
    var page = window.location.pathname.split("/").pop() || "index.html";
    if (page === "") page = "index.html";
    document.querySelectorAll(".nav-link").forEach(function (link) {
        var href = link.getAttribute("href") || "";
        link.classList.toggle("active", href === page);
    });
}

/* Page Initialisation */

document.addEventListener("DOMContentLoaded", function () {

    /* Always run */
    initMobileNav();
    highlightActiveNav();

    /* ---- Index page ---- */
    if (document.getElementById("slides-track")) {
        initHeroSlider();
        loadCatalogXML(function (catalog) {
            renderFeaturedCourses(catalog.courses);
            renderTrendingCarousel(catalog.courses);
        });
    }

    /* ---- Courses page ---- */
    if (document.getElementById("sidebar-nav")) {
        var panelContainer = document.getElementById("lesson-panel");
        if (panelContainer) panelContainer.style.display = "none";
        loadCatalogXML(function (catalog) {
            initCoursesPage(catalog);
        });
    }

    /* ---- Register page ---- */
    if (document.getElementById("registration-form")) {
        initRegisterForm();
    }

    /* ---- Contact page ---- */
    if (document.getElementById("contact-form")) {
        initContactForm();
    }
});
