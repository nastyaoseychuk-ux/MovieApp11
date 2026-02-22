const API_KEY = "fa007b99eca4a9e5db0525b1646d0243";

// Intersection Observer для плавної появи при прокручуванні
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return;

        const isText = entry.target.classList.contains('fade-in-text');
        const baseDelay = isText ? 15 : 80; // швидший інтервал для тексту

        // Додаємо видимість для самого елементу
        setTimeout(() => {
            entry.target.classList.add('visible');
        }, index * baseDelay);
        observer.unobserve(entry.target);

        // Якщо це текст, одночасно запустимо появу карточок у тій самій секції
        if (isText) {
            // шукаємо найближчу секцію або контейнер
            const container = entry.target.closest('section, main, .movies-container, .details-wrapper');
            const scope = container || document;
            const cards = Array.from(scope.querySelectorAll('.fade-in-element'))
                .filter(el => !el.classList.contains('visible') && el !== entry.target);

            cards.forEach((card, i) => {
                setTimeout(() => {
                    card.classList.add('visible');
                    try { observer.unobserve(card); } catch(e){}
                }, i * 60 + 30);
            });
        }
    });
}, observerOptions);

// Функція для спостереження за елементами
function observeElements() {
    document.querySelectorAll('.fade-in-element').forEach((el, index) => {
        observer.observe(el);
    });
}

// Спостерігаємо за елементами при завантаженні
// Помітити текстові елементи класом для появи при скролі
function markTextForFade() {
    const selectors = [
        '.header-text',
        '.mainText',
        '.section-title',
        '.section-description',
        'h1', 'h2', 'h3', 'p'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
        if (!el.classList.contains('fade-in-element')) el.classList.add('fade-in-element');
        if (!el.classList.contains('fade-in-text')) el.classList.add('fade-in-text');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    markTextForFade();
    observeElements();
});

// Якщо хедер завантажується динамічно, слідкуємо за placeholder і викликаємо updateAuthUI коли з'явиться
function initHeaderObserver() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;
    if (placeholder.querySelector('.auth-section')) {
        updateAuthUI();
        return;
    }
    const mo = new MutationObserver((mutations, obs) => {
        if (placeholder.querySelector('.auth-section')) {
            updateAuthUI();
            obs.disconnect();
        }
    });
    mo.observe(placeholder, { childList: true, subtree: true });
}

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function fetchData(path) {
    try {
        const separator = path.includes('?') ? '&' : '?';
        const url = path.startsWith('http') 
            ? path 
            : `https://api.themoviedb.org/3${path}${separator}api_key=${API_KEY}&language=uk-UA`;
            
        const res = await fetch(url);
        return await res.json();
    } catch (e) { 
        console.error("Помилка завантаження:", e); 
        return { results: [] }; 
    }
}

function createCard(item, type) {
    const title = item.title || item.name;
    // Support both API items (with poster_path) and saved favorites (with full poster URL in `poster`)
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
        : (item.poster ? item.poster : 'https://via.placeholder.com/300x450?text=No+Image');
    const itemType = type || (item.title ? 'movie' : 'tv');
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    const encoded = encodeURIComponent(JSON.stringify({ id: item.id, title, poster, type: itemType, genre_ids: item.genre_ids || item.genre_ids || [] }));

    return `
        <div class="movie-card fade-in-element">
            <img src="${poster}" alt="${title}">
            <div class="movie-card-info">
                <h3>${title}</h3>
                <div class="rating">★ ${rating}</div>
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <a href="details.html?id=${item.id}&type=${itemType}" class="btn-details">Детальніше</a>
                    <button onclick="addToFavorites('${encoded}')" class="btn-fav">♥</button>
                </div>
            </div>
        </div>`;
}



function updateAuthUI() {
    const currentUser = localStorage.getItem("currentUser");
    const authSection = document.querySelector(".auth-section");
    
    if (!authSection) {
        console.error("Помилка: Не знайдено блок з класом .auth-section");
        return;
    }

    if (currentUser && currentUser !== "null" && currentUser !== "") {
        const displayName = localStorage.getItem("currentUserName") || currentUser;
        authSection.innerHTML = `
            <div class="user-controls" style="display:flex; gap:10px; align-items:center;">
                <button class="btn-auth" id="profileBtn" onclick="location.href='profile.html'">
                    👤 ${displayName}
                </button>
                <button class="btn" id="logoutBtn">
                    Вийти
                </button>
            </div>`;
    } else {
        // Використовуємо ідентифікатор authBtn, щоб делегований обробник кліків працював коректно
        authSection.innerHTML = `<button class="btn-auth" id="authBtn"><span class="icon">👤</span> <span class="auth-text">Увійти</span></button>`;
    }
}

window.openAuthModal = function () {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "flex";
};

function renderBackButton() {
    // Back button removed from all pages
}

window.toggleAuth = function(type) {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("regForm");
    if (loginForm) loginForm.style.display = type === 'login' ? 'block' : 'none';
    if (regForm) regForm.style.display = type === 'reg' ? 'block' : 'none';
};

window.handleLogin = function(e) {
    if (e) e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const pass = document.getElementById("loginPass").value.trim();

    const userData = localStorage.getItem(`user_${email}`);
    
    if (!userData) {
        alert("Користувача не знайдено!");
        return;
    }

    const user = JSON.parse(userData);

    if (user.pass !== pass) {
        alert("Невірний пароль!");
        return;
    }

    localStorage.setItem("currentUser", user.email);
    localStorage.setItem("currentUserName", user.name);

    document.getElementById("authModal").style.display = "none";

    // Оновлюємо UI без перевантаження сторінки
    updateAuthUI();
    loadHome();
    loadProfile();
};

window.handleRegister = function(e) {
    if (e) e.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const pass = document.getElementById("regPass").value.trim();

    if (!name || !validateEmail(email) || pass.length < 4) {
        alert("Перевірте дані!");
        return;
    }

    if (localStorage.getItem(`user_${email}`)) {
        alert("Пошта зайнята!");
        return;
    }

    const user = {
        name: name,
        email: email,
        pass: pass
    };

    localStorage.setItem(`user_${email}`, JSON.stringify(user));

    alert("Успіх! Тепер увійдіть.");
    toggleAuth('login');
};



window.addToFavorites = function(encodedItem) {
    const user = localStorage.getItem("currentUser");
    if (!user) {
        alert("Увійдіть в акаунт!");
        document.getElementById("authModal").style.display = "flex";
        return;
    }
    try {
        const item = JSON.parse(decodeURIComponent(encodedItem));
        let favs = JSON.parse(localStorage.getItem(`fav_${user}`)) || [];
        if (favs.some(f => f.id === item.id && f.type === item.type)) return alert("Вже в обраному!");
        // ensure fields
        const toSave = { id: item.id, title: item.title || item.name, poster: item.poster, type: item.type || 'movie', genre_ids: item.genre_ids || [] };
        favs.push(toSave);
        localStorage.setItem(`fav_${user}`, JSON.stringify(favs));
        alert(`"${toSave.title}" додано!`);
    } catch (e) {
        console.error('addToFavorites error', e);
        alert('Не вдалося додати в обране');
    }
};

function performSearch() {
    const input = document.getElementById("searchInput");
    if (input && input.value.trim()) {
        window.location.href = `catalog.html?search=${encodeURIComponent(input.value.trim())}`;
    }
}

let searchTimeout;

async function liveSearch(query) {
    const resultsBox = document.getElementById("searchResults");
    if (!resultsBox) return;

    if (!query) {
        resultsBox.innerHTML = "";
        resultsBox.style.display = "none";
        return;
    }

    const data = await fetchData(`/search/multi?query=${encodeURIComponent(query)}`);

    const filtered = (data.results || []).filter(item => {
        const title = (item.title || item.name || "").toLowerCase();
        return title.startsWith(query.toLowerCase());
    });

    if (filtered.length === 0) {
        resultsBox.innerHTML = "<div style='color: white;'>Нічого не знайдено</div>";
        resultsBox.style.display = "block";
        return;
    }

    resultsBox.innerHTML = filtered.slice(0, 8).map(item => {
        const title = item.title || item.name;
        const type = item.media_type || (item.title ? "movie" : "tv");

        return `
            <div onclick="location.href='details.html?id=${item.id}&type=${type}'">
                ${title}
            </div>
        `;
    }).join("");

    resultsBox.style.display = "block";
}

async function loadHome() {
    const topCont = document.getElementById("top-movies-home");
    const newCont = document.getElementById("new-tv-home");
    if (!topCont || !newCont) return;

    const topMovies = await fetchData("/movie/popular?page=1");
    topCont.innerHTML = topMovies.results.slice(0, 5).map(i => createCard(i, 'movie')).join('');

    const newTV = await fetchData("/discover/tv?sort_by=popularity.desc&first_air_date.gte=2025-01-01&first_air_date.lte=2026-12-31");
    newCont.innerHTML = newTV.results.slice(0, 5).map(i => createCard(i, 'tv')).join('');
    
    observeElements();
}

async function loadTrendingNow() {
    const trendingCont = document.getElementById("trending-now-home");
    if (!trendingCont) return;

    const moviePath = `/discover/movie?sort_by=popularity.desc&primary_release_date.gte=2025-01-01&primary_release_date.lte=2026-12-31`;
    const tvPath = `/discover/tv?sort_by=popularity.desc&first_air_date.gte=2025-01-01&first_air_date.lte=2026-12-31`;

    const [movies, tv] = await Promise.all([fetchData(moviePath), fetchData(tvPath)]);
    let combined = [
        ...(movies.results || []).map(i => ({ ...i, m_type: 'movie' })),
        ...(tv.results || []).map(i => ({ ...i, m_type: 'tv' }))
    ];
    combined.sort((a, b) => b.popularity - a.popularity);
    trendingCont.innerHTML = combined.slice(0, 10).map(i => createCard(i, i.m_type)).join('');
}

async function loadCatalog() {
    const cont = document.getElementById("movies");
    if (!cont) return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get("search");
    const g = params.get("genre");
    const type = params.get("type") || "movie"; 
    const sort = params.get("sort"); // Додано обробку параметра sort

    let path = "";

    if (q) {
        // Пошук
        path = `/search/multi?query=${encodeURIComponent(q)}`;
    } else if (g) {
        // За жанром (і "Всі мультфільми", оскільки вони використовують genre=16)
        path = `/discover/${type}?with_genres=${g}`;
    } else if (sort === 'top') {
        // Топ-10 (найрейтинговіші)
        path = `/${type}/top_rated?page=1`;
    } else if (sort === 'new') {
        // Новинки (відсортовані за датою релізу)
        const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
        path = `/discover/${type}?sort_by=${dateField}.desc`;
    } else {
        // Кнопка "Всі" (за замовчуванням завантажує популярні)
        path = `/${type}/popular?page=1`;
    }

    const data = await fetchData(path);
    
    if (data.results && data.results.length > 0) {
        cont.innerHTML = data.results.map(i => createCard(i, i.media_type || type)).join('');
    } else {
        cont.innerHTML = "<h2 style='color: white;'>Нічого не знайдено</h2>";
    }
    
    observeElements();
}

async function loadMovieDetails() {
    const cont = document.getElementById("details-content");
    if (!cont) return;
    const p = new URLSearchParams(window.location.search);
    const d = await fetchData(`/${p.get('type') || 'movie'}/${p.get('id')}`);
    
    cont.innerHTML = `
        <div class="details-wrapper" style="display:flex; gap:30px; padding:40px; flex-wrap:wrap; color: white;">
            <img src="https://image.tmdb.org/t/p/w500${d.poster_path}" style="border-radius:15px; width:350px;">
            <div style="flex:1; min-width:300px;">
                <h1 style="color: white;">${d.title || d.name}</h1>
                <p style="font-size:1.1rem; margin:20px 0;">${d.overview || "Опис відсутній."}</p>
                <div style="background: #222; padding: 15px; border-radius: 10px;">
                    <p>⭐ Рейтинг: <span class="rating">${d.vote_average.toFixed(1)}</span></p>
                    <p>📅 Реліз: ${d.release_date || d.first_air_date}</p>
                </div>
                <button class="btn" onclick="window.history.back()" style="margin-top:20px; background-color:var(--primary);">← Назад</button>
            </div>
        </div>`;
}


function loadProfile() {
    const cont = document.getElementById("favorite-movies");
    if (!cont) return;

    const user = localStorage.getItem("currentUser");
    
    if (!user || user === "null") {
        // Якщо користувач не авторизований — перенаправляємо на головну
        location.href = 'index.html';
        return;
    }


    const favs = JSON.parse(localStorage.getItem(`fav_${user}`)) || [];

    const renderList = (filter) => {
        let list = favs;
        if (filter === 'movies') list = favs.filter(f => f.type === 'movie' && !(f.genre_ids || []).includes(16));
        if (filter === 'tv') list = favs.filter(f => f.type === 'tv');
        if (filter === 'cartoons') list = favs.filter(f => (f.genre_ids || []).includes(16));

        if (list.length === 0) {
            cont.innerHTML = "<h2 style='color:white; text-align:center; width:100%;'>Список порожній</h2>";
        } else {
            cont.innerHTML = list.map(item => createCard(item, item.type)).join('');
        }
        observeElements();
    };

    // Ініціалізація кнопок фільтрації
    const btnMovies = document.getElementById('fav-movies-btn');
    const btnTV = document.getElementById('fav-tv-btn');
    const btnCartoons = document.getElementById('fav-cartoons-btn');
    if (btnMovies && btnTV && btnCartoons) {
        btnMovies.addEventListener('click', () => renderList('movies'));
        btnTV.addEventListener('click', () => renderList('tv'));
        btnCartoons.addEventListener('click', () => renderList('cartoons'));
    }

    // Початковий показ — всі
    renderList('movies');
}



document.addEventListener("click", (e) => {
    const target = e.target;
    if (target.id === "authBtn") document.getElementById("authModal").style.display = "flex";
    if (target.classList.contains("close-modal") || target.id === "authModal") {
        document.getElementById("authModal").style.display = "none";
    }
    if (target.id === "logoutBtn") {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentUserName");
        // після логаута відправимо користувача на головну і оновимо UI
        updateAuthUI();
        loadHome();
        loadProfile();
        location.href = 'index.html';
    }
    if (target.id === "searchBtn") performSearch();

  
    const mainBtn = target.closest(".btn");
    if (mainBtn && mainBtn.parentElement.parentElement.classList.contains("buttonHeader")) {
        const parent = mainBtn.parentElement;
        document.querySelectorAll('.buttonHeader > div').forEach(div => div !== parent && div.classList.remove("active"));
        document.querySelectorAll('.genreMenu').forEach(el => el.classList.remove("active"));
        parent.classList.toggle("active");
    }
    if (target.classList.contains("genreBtn")) {
        e.stopPropagation();
        target.parentElement.classList.toggle("active");
    }
    if (!target.closest(".buttonHeader")) {
        document.querySelectorAll('.buttonHeader > div, .genreMenu').forEach(el => el.classList.remove("active"));
    }
});

const searchInput = document.getElementById("searchInput");

searchInput?.addEventListener("input", (e) => {
    const value = e.target.value.trim();

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        liveSearch(value);
    }, 300);
});

searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
});

function createFloatingBean() {
  const bean = document.createElement("div")
  bean.textContent = "🎥"
  bean.style.position = "fixed"
  bean.style.fontSize = Math.random() * 20 + 20 + "px"
  bean.style.left = Math.random() * 100 + "%"
  bean.style.top = "100%"
  bean.style.opacity = "0.1"
  bean.style.pointerEvents = "none"
  bean.style.zIndex = "0"
  bean.style.transition = "all 10s linear"

  document.body.appendChild(bean)

  setTimeout(() => {
    bean.style.top = "-100px"
    bean.style.transform = `rotate(${Math.random() * 360}deg)`
  }, 100)

  setTimeout(() => {
    bean.remove()
  }, 10000)
}

function createFloatingBean1() {
  const bean = document.createElement("div")
  bean.textContent = "🎬"
  bean.style.position = "fixed"
  bean.style.fontSize = Math.random() * 20 + 20 + "px"
  bean.style.left = Math.random() * 100 + "%"
  bean.style.top = "100%"
  bean.style.opacity = "0.1"
  bean.style.pointerEvents = "none"
  bean.style.zIndex = "0"
  bean.style.transition = "all 10s linear"

  document.body.appendChild(bean)

  setTimeout(() => {
    bean.style.top = "-100px"
    bean.style.transform = `rotate(${Math.random() * 360}deg)`
  }, 100)

  setTimeout(() => {
    bean.remove()
  }, 10000)
}

window.addEventListener('DOMContentLoaded', () => {
    initHeaderObserver();
    updateAuthUI();
    renderBackButton();
    loadHome();
    loadTrendingNow();
    loadCatalog();
    loadMovieDetails();
    loadProfile();
    setInterval(createFloatingBean, 2000);
    setInterval(createFloatingBean1, 2000);
});

