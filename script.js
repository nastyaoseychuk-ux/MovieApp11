const API_KEY = "fa007b99eca4a9e5db0525b1646d0243";



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
    const poster = item.poster_path 
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}` 
        : 'https://via.placeholder.com/300x450?text=No+Image';
    const itemType = type || (item.title ? 'movie' : 'tv');
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    return `
        <div class="movie-card">
            <img src="${poster}" alt="${title}">
            <div class="movie-card-info">
                <h3>${title}</h3>
                <div class="rating">★ ${rating}</div>
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <a href="details.html?id=${item.id}&type=${itemType}" class="btn-details">Детальніше</a>
                    <button onclick="addToFavorites(${item.id}, '${title.replace(/'/g, "\\'")}', '${poster}', '${itemType}')" class="btn-fav">♥</button>
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
        
        authSection.innerHTML = `
            <div class="user-controls" style="display:flex; gap:10px; align-items:center;">
                <button class="btn" onclick="location.href='profile.html'" style="background: #000000; color: black; font-weight: bold;">
                    👤 ${currentUser}
                </button>
                <button class="btn" id="logoutBtn" style="background:#ff4d4d; color:white;">
                    Вийти
                </button>
            </div>`;
    } else {
       
        authSection.innerHTML = `<button class="btn" onclick="openAuthModal()">Увійти</button>`;
    }
}

window.openAuthModal = function () {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "flex";
};

function renderBackButton() {
    const backCont = document.getElementById("back-button-container");
    if (backCont) {
        backCont.innerHTML = `
            <button class="btn-back-main" onclick="window.location.href='index.html'" style="margin-bottom: 20px;">
                ← На головну
            </button>`;
    }
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

    location.reload();
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



window.addToFavorites = function(id, title, poster, type) {
    const user = localStorage.getItem("currentUser");
    if (!user) {
        alert("Увійдіть в акаунт!");
        document.getElementById("authModal").style.display = "flex";
        return;
    }
    let favs = JSON.parse(localStorage.getItem(`fav_${user}`)) || [];
    if (favs.some(f => f.id === id)) return alert("Вже в обраному!");
    favs.push({ id, title, poster, type: type || 'movie' });
    localStorage.setItem(`fav_${user}`, JSON.stringify(favs));
    alert(`"${title}" додано!`);
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
        resultsBox.innerHTML = "Нічого не знайдено";
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

    let path = q ? `/search/multi?query=${encodeURIComponent(q)}` 
             : g ? `/discover/${type}?with_genres=${g}` 
             : `/${type}/popular?page=1`;

    const data = await fetchData(path);
    cont.innerHTML = data.results.length ? data.results.map(i => createCard(i, i.media_type || type)).join('') : "<h2>Нічого не знайдено</h2>";
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
                <h1 style="color: #f1c40f;">${d.title || d.name}</h1>
                <p style="font-size:1.1rem; margin:20px 0;">${d.overview || "Опис відсутній."}</p>
                <div style="background: #222; padding: 15px; border-radius: 10px;">
                    <p>⭐ Рейтинг: <b>${d.vote_average.toFixed(1)}</b></p>
                    <p>📅 Реліз: ${d.release_date || d.first_air_date}</p>
                </div>
                <button class="btn" onclick="window.history.back()" style="margin-top:20px;">← Назад</button>
            </div>
        </div>`;
}


function loadProfile() {
    const cont = document.getElementById("favorite-movies");
    if (!cont) return;

    const user = localStorage.getItem("currentUser");
    
    if (!user || user === "null") {
        cont.innerHTML = `
            <div style="text-align:center; padding:50px;">
                <h2 style="color:white;">Ви не увійшли в акаунт</h2>
                <button class="btn" onclick="location.href='index.html'" style="margin-top:20px;">На головну</button>
            </div>`;
        return;
    }


    const favs = JSON.parse(localStorage.getItem(`fav_${user}`)) || [];

    if (favs.length === 0) {
        cont.innerHTML = "<h2 style='color:white; text-align:center; width:100%;'>Ваш список обраного поки порожній 🍿</h2>";
    } else {
        
        cont.innerHTML = favs.map(item => createCard(item, item.type)).join('');
    }
}



document.addEventListener("click", (e) => {
    const target = e.target;
    if (target.id === "authBtn") document.getElementById("authModal").style.display = "flex";
    if (target.classList.contains("close-modal") || target.id === "authModal") {
        document.getElementById("authModal").style.display = "none";
    }
    if (target.id === "logoutBtn") {
        localStorage.removeItem("currentUser");
        location.reload();
    }
    if (target.id === "searchBtn") performSearch();

  
    const mainBtn = target.closest(".btn");
    if (mainBtn && mainBtn.parentElement.parentElement.classList.contains("buttonHeader")) {
        const parent = mainBtn.parentElement;
        document.querySelectorAll('.buttonHeader > div').forEach(div => div !== parent && div.classList.remove("active"));
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



window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    renderBackButton();
    loadHome();
    loadTrendingNow();
    loadCatalog();
    loadMovieDetails();
    loadProfile(); 
});