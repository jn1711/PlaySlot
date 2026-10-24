const fs = require('fs');

const i18nContent = fs.readFileSync('src/main/resources/static/i18n_extracted.js', 'utf8');

const appLogic = `
// ==========================================
// 2. HELPER UTILITIES & XSS ESCAPING
// ==========================================
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return \`\${day}.\${month}.\${year}\`;
}

function formatDateTime(dtInput) {
    if (!dtInput) return '';
    const d = new Date(dtInput);
    if (isNaN(d.getTime())) return String(dtInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return \`\${day}.\${month} \${hours}:\${mins}\`;
}

function getErrorMessage(error, lang) {
    const l = lang || state.currentLang || 'kk';
    if (!error) return '';

    if (error.data && error.data.error) {
        return error.data.error;
    }
    if (error.data && error.data.message) {
        return error.data.message;
    }

    const dict = {
        kk: {
            400: 'Қате сұраныс: деректерді тексеріңіз',
            401: 'Кіру қажет немесе логин/құпиясөз қате',
            403: 'Бұл әрекетті орындауға рұқсатыңыз жоқ',
            404: 'Сұралған мәлімет табылмады',
            409: 'Деректер қақтығысы: уақыт бос емес немесе жазба бар',
            500: 'Серверлік қате, кейінірек қайталап көріңіз',
            0: 'Желілік қате: интернет байланысын тексеріңіз'
        },
        ru: {
            400: 'Неверный запрос: проверьте введенные данные',
            401: 'Требуется авторизация или неверный логин/пароль',
            403: 'У вас нет прав для выполнения этого действия',
            404: 'Запрошенный ресурс не найден',
            409: 'Конфликт данных: время занято или запись уже существует',
            500: 'Внутренняя ошибка сервера, попробуйте позже',
            0: 'Ошибка сети: проверьте подключение к интернету'
        },
        en: {
            400: 'Bad request: please check your input',
            401: 'Authentication required or invalid credentials',
            403: 'Access denied: you do not have permission',
            404: 'Requested resource not found',
            409: 'Data conflict: time slot is taken or already exists',
            500: 'Internal server error, please try again later',
            0: 'Network error: please check your connection'
        }
    };

    const statusMap = dict[l] || dict.kk;
    return statusMap[error.status] || error.message || 'Қате орын алды';
}

function handleApiError(error, customPrefix = '') {
    const msg = getErrorMessage(error, state.currentLang);
    const displayMsg = customPrefix ? \`\${customPrefix}: \${msg}\` : msg;
    showToast(displayMsg, 'error');
    console.error('[PlaySlot Error]', error);
    return displayMsg;
}

// ==========================================
// 3. APPLICATION STATE
// ==========================================
const state = {
    currentLang: localStorage.getItem('playslot_lang') || 'kk',
    currentUser: null, // { fullName, email, role } from /api/auth/me
    currentRole: 'GUEST', // 'GUEST' | 'PLAYER' | 'OWNER' | 'ADMIN'
    currentView: 'home',
    selectedCourt: null,
    selectedDate: null, // YYYY-MM-DD
    selectedSlots: [],
    hourlyRate: 6000,
    totalPrice: 0,
    viewMode: 'split',
    activeSport: 'all',
    activeCity: 'all',
    activeDistrict: 'all',
    activePrice: 'all',
    searchQuery: '',
    profileTab: 'bookings',
    reviewRating: 5
};

function t(key) {
    const dict = i18nData[state.currentLang] || i18nData.kk;
    return dict[key] || i18nData.kk[key] || key;
}

// ==========================================
// 4. LANGUAGE SWITCHER
// ==========================================
function setLanguage(lang) {
    if (!i18nData[lang]) return;
    state.currentLang = lang;
    localStorage.setItem('playslot_lang', lang);
    document.documentElement.lang = lang;

    ['kk', 'en', 'ru'].forEach(l => {
        const btn = document.getElementById('lang-btn-' + l);
        if (btn) {
            btn.className = (l === lang)
                ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow-sm transition-all'
                : 'px-2.5 py-1 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary transition-all';
        }
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && i18nData[lang] && i18nData[lang][key]) {
            el.textContent = i18nData[lang][key];
        }
    });

    updateUIForRole();
}

// ==========================================
// 5. AUTHENTICATION & ROLE MANAGEMENT
// ==========================================
async function checkAuth() {
    try {
        const user = await api.auth.me();
        state.currentUser = user;
        state.currentRole = user.role;
    } catch (e) {
        state.currentUser = null;
        state.currentRole = 'GUEST';
    }
    updateUIForRole();
}

function updateUIForRole() {
    const role = state.currentRole;
    const user = state.currentUser;

    const navOwner = document.getElementById('nav-link-owner');
    const navAdmin = document.getElementById('nav-link-admin');
    const dropdownOwner = document.getElementById('dropdown-link-owner');
    const dropdownAdmin = document.getElementById('dropdown-link-admin');
    const footerOwner = document.getElementById('footer-link-owner');
    const guestLoginBtn = document.getElementById('btn-guest-login');
    const userMenuContainer = document.getElementById('user-menu-container');

    if (role === 'GUEST' || !user) {
        if (navOwner) navOwner.classList.add('hidden'), navOwner.classList.remove('inline-flex');
        if (navAdmin) navAdmin.classList.add('hidden'), navAdmin.classList.remove('inline-flex');
        if (dropdownOwner) dropdownOwner.classList.add('hidden');
        if (dropdownAdmin) dropdownAdmin.classList.add('hidden');
        if (footerOwner) footerOwner.classList.add('hidden');

        if (guestLoginBtn) guestLoginBtn.classList.remove('hidden'), guestLoginBtn.classList.add('inline-flex');
        if (userMenuContainer) userMenuContainer.classList.add('hidden');
    } else {
        if (guestLoginBtn) guestLoginBtn.classList.add('hidden'), guestLoginBtn.classList.remove('inline-flex');
        if (userMenuContainer) userMenuContainer.classList.remove('hidden');

        const parts = (user.fullName || '').trim().split(' ');
        const shortName = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
        const initials = ((parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '')).toUpperCase() || 'U';

        const uDisplayName = document.getElementById('user-display-name');
        const uAvatarBadge = document.getElementById('user-avatar-badge');
        const uDropdownName = document.getElementById('dropdown-user-name');
        const uDropdownEmail = document.getElementById('dropdown-user-email');
        const uDisplayRole = document.getElementById('user-display-role');
        const uDropdownRoleBadge = document.getElementById('dropdown-user-role-badge');

        if (uDisplayName) uDisplayName.textContent = shortName;
        if (uAvatarBadge) uAvatarBadge.textContent = initials;
        if (uDropdownName) uDropdownName.textContent = user.fullName;
        if (uDropdownEmail) uDropdownEmail.textContent = user.email;

        const roleText = (role === 'ADMIN') ? 'Әкімші' : (role === 'OWNER') ? 'Алаң иесі' : 'Ойыншы';
        if (uDisplayRole) uDisplayRole.textContent = roleText;
        if (uDropdownRoleBadge) uDropdownRoleBadge.textContent = \`\${role} (\${roleText})\`;

        // Profile View Elements
        const pName = document.getElementById('profile-page-name');
        const pRole = document.getElementById('profile-page-role');
        const pEmail = document.getElementById('profile-page-email');
        const pAvatar = document.getElementById('profile-page-avatar');
        if (pName) pName.textContent = user.fullName;
        if (pRole) pRole.textContent = roleText;
        if (pEmail) pEmail.textContent = user.email;
        if (pAvatar) pAvatar.textContent = initials;

        // Permissions
        if (role === 'OWNER' || role === 'ADMIN') {
            if (navOwner) navOwner.classList.remove('hidden'), navOwner.classList.add('inline-flex');
            if (dropdownOwner) dropdownOwner.classList.remove('hidden');
            if (footerOwner) footerOwner.classList.remove('hidden');
        } else {
            if (navOwner) navOwner.classList.add('hidden'), navOwner.classList.remove('inline-flex');
            if (dropdownOwner) dropdownOwner.classList.add('hidden');
            if (footerOwner) footerOwner.classList.add('hidden');
        }

        if (role === 'ADMIN') {
            if (navAdmin) navAdmin.classList.remove('hidden'), navAdmin.classList.add('inline-flex');
            if (dropdownAdmin) dropdownAdmin.classList.remove('hidden');
        } else {
            if (navAdmin) navAdmin.classList.add('hidden'), navAdmin.classList.remove('inline-flex');
            if (dropdownAdmin) dropdownAdmin.classList.add('hidden');
        }
    }

    if (state.currentView === 'owner') applyOwnerViewAccess();
    if (state.currentView === 'admin') applyAdminViewAccess();
}

function applyOwnerViewAccess() {
    const guard = document.getElementById('owner-guard-banner');
    const content = document.getElementById('owner-main-content');
    if (state.currentRole === 'OWNER' || state.currentRole === 'ADMIN') {
        if (guard) guard.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    } else {
        if (guard) guard.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }
}

function applyAdminViewAccess() {
    const guard = document.getElementById('admin-guard-banner');
    const content = document.getElementById('admin-main-content');
    if (state.currentRole === 'ADMIN') {
        if (guard) guard.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    } else {
        if (guard) guard.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }
}

// Modal tab switcher
function switchAuthTab(tab) {
    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) errBox.classList.add('hidden');

    if (tab === 'login') {
        tabLogin.className = 'text-sm font-bold border-b-2 border-primary text-primary pb-1';
        tabRegister.className = 'text-sm font-bold text-text-secondary hover:text-text-primary pb-1';
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    } else {
        tabRegister.className = 'text-sm font-bold border-b-2 border-primary text-primary pb-1';
        tabLogin.className = 'text-sm font-bold text-text-secondary hover:text-text-primary pb-1';
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    }
}

function fillTestAuth(email, pass) {
    const em = document.getElementById('login-email');
    const pw = document.getElementById('login-password');
    if (em) em.value = email;
    if (pw) pw.value = pass;
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('auth-error-msg');
    const errText = document.getElementById('auth-error-text');

    try {
        const user = await api.auth.login({ email, password });
        state.currentUser = user;
        state.currentRole = user.role;
        updateUIForRole();
        closeLoginModal();
        showToast(state.currentLang === 'en' ? 'Logged in successfully!' : state.currentLang === 'ru' ? 'Вход выполнен успешно!' : 'Жүйеге сәтті кірдіңіз!', 'check_circle');
        if (state.currentView === 'profile') loadProfile();
        if (state.currentView === 'owner') loadOwnerDashboard();
        if (state.currentView === 'admin') loadAdminDashboard();
    } catch (err) {
        const msg = getErrorMessage(err, state.currentLang);
        if (errBox && errText) {
            errText.textContent = msg;
            errBox.classList.remove('hidden');
        }
        showToast(msg, 'error');
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const fullName = document.getElementById('register-fullname').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const errBox = document.getElementById('auth-error-msg');
    const errText = document.getElementById('auth-error-text');

    try {
        await api.auth.register({ fullName, email, password, role });
        // Automatically log in
        const user = await api.auth.login({ email, password });
        state.currentUser = user;
        state.currentRole = user.role;
        updateUIForRole();
        closeLoginModal();
        showToast(state.currentLang === 'en' ? 'Registration successful!' : state.currentLang === 'ru' ? 'Регистрация прошла успешно!' : 'Тіркелу сәтті өтті!', 'check_circle');
    } catch (err) {
        const msg = getErrorMessage(err, state.currentLang);
        if (errBox && errText) {
            errText.textContent = msg;
            errBox.classList.remove('hidden');
        }
        showToast(msg, 'error');
    }
}

async function logoutAction() {
    try {
        await api.auth.logout();
    } catch (e) {
        console.warn('Logout notification error:', e);
    }
    state.currentUser = null;
    state.currentRole = 'GUEST';
    updateUIForRole();
    closeUserMenu();
    switchView('home');
    showToast(state.currentLang === 'en' ? 'Logged out' : state.currentLang === 'ru' ? 'Вы вышли из системы' : 'Жүйеден шықтыңыз', 'logout');
}

// ==========================================
// 6. NAVIGATION & VIEW SWITCHING
// ==========================================
function switchView(viewName) {
    if (viewName === 'profile' && state.currentRole === 'GUEST') {
        openLoginModal();
        return;
    }

    state.currentView = viewName;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));

    const panel = document.getElementById('view-' + viewName);
    if (panel) {
        panel.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const navIds = ['home', 'courts', 'games', 'owner', 'admin'];
    navIds.forEach(id => {
        const el = document.getElementById('nav-link-' + id);
        if (el) {
            el.className = (id === viewName)
                ? 'border-b-2 border-primary text-primary pb-1 font-semibold transition-colors inline-flex items-center gap-1.5'
                : 'text-text-secondary hover:text-text-primary pb-1 transition-colors inline-flex items-center gap-1.5';
        }
    });

    const mobileIds = ['home', 'courts', 'games', 'profile'];
    mobileIds.forEach(id => {
        const mEl = document.getElementById('mobile-nav-' + id);
        if (mEl) {
            mEl.className = (id === viewName)
                ? 'flex flex-col items-center justify-center bg-primary-soft text-primary rounded-xl px-3 py-1 text-xs font-semibold'
                : 'flex flex-col items-center justify-center text-text-secondary px-3 py-1 text-xs';
        }
    });

    if (viewName === 'home') loadHomeData();
    if (viewName === 'courts') loadCourts();
    if (viewName === 'games') loadGames();
    if (viewName === 'profile') loadProfile();
    if (viewName === 'owner') { applyOwnerViewAccess(); loadOwnerDashboard(); }
    if (viewName === 'admin') { applyAdminViewAccess(); loadAdminDashboard(); }
}

// ==========================================
// 7. HOME VIEW (FEATURED COURTS & HERO)
// ==========================================
async function loadHomeData() {
    try {
        const homeData = await api.home();
        const grid = document.getElementById('home-featured-grid');
        if (!grid) return;

        const featured = homeData.featuredCourts || [];
        if (featured.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-8 text-center text-text-muted text-sm">Әзірге алаңдар табылмады</div>';
            return;
        }

        grid.innerHTML = '';
        featured.forEach(court => {
            const card = document.createElement('div');
            card.className = 'bg-surface-default border border-surface-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all flex flex-col';

            const photo = (court.photoUrls && court.photoUrls.length > 0)
                ? court.photoUrls[0]
                : 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80';

            const sportLabel = escapeHtml(court.sportType);
            const name = escapeHtml(court.name);
            const location = escapeHtml(court.city + (court.district ? ', ' + court.district : ''));
            const price = Number(court.hourlyPrice || 0).toLocaleString('kk-KZ');

            card.innerHTML = \`
                <div class="relative h-48 bg-slate-200 overflow-hidden">
                    <img src="\${escapeHtml(photo)}" alt="\${name}" class="w-full h-full object-cover" />
                    <div class="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-primary text-xs px-2.5 py-1 rounded-md shadow-sm font-semibold">\${sportLabel}</div>
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-base font-bold text-text-primary">\${name}</h3>
                        <div class="flex items-center gap-1 text-text-secondary text-xs mt-1">
                            <span class="material-symbols-outlined text-sm">location_on</span>
                            <span>\${location}</span>
                        </div>
                    </div>
                    <div class="mt-5 pt-4 border-t border-surface-border flex items-center justify-between">
                        <div>
                            <span class="text-lg font-bold text-text-primary">\${price} ₸</span>
                            <span class="text-xs text-text-secondary"> / сағ</span>
                        </div>
                        <button class="btn-book px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all">Брондау</button>
                    </div>
                </div>
            \`;
            card.querySelector('.btn-book').addEventListener('click', () => openBooking(court.id));
            grid.appendChild(card);
        });
    } catch (e) {
        console.warn('Failed to load home featured data:', e);
    }
}

function handleHeroSearch() {
    const sportEl = document.getElementById('search-sport');
    const cityEl = document.getElementById('search-city');
    if (sportEl) state.activeSport = sportEl.value;
    if (cityEl) state.activeCity = cityEl.value;
    switchView('courts');
}

// ==========================================
// 8. COURTS CATALOG & AVAILABILITY
// ==========================================
function filterCourts(sportName) {
    document.querySelectorAll('.court-filter-chip').forEach(chip => {
        const chipSport = chip.getAttribute('data-sport');
        if (chipSport === sportName) {
            chip.className = 'court-filter-chip px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-white transition-colors';
        } else {
            chip.className = 'court-filter-chip px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-default text-text-primary border border-surface-border hover:border-primary transition-colors';
        }
    });

    state.activeSport = (sportName === 'Барлығы' || sportName === 'all') ? 'all' : sportName;
    applyCourtFilters();
}

function applyCourtFilters() {
    const searchEl = document.getElementById('filter-search');
    const cityEl = document.getElementById('filter-city');
    const districtEl = document.getElementById('filter-district');
    const priceEl = document.getElementById('filter-price');

    state.searchQuery = searchEl ? searchEl.value.trim() : '';
    state.activeCity = cityEl ? cityEl.value : 'all';
    state.activeDistrict = districtEl ? districtEl.value : 'all';
    state.activePrice = priceEl ? priceEl.value : 'all';

    loadCourts();
}

async function loadCourts() {
    const listCol = document.getElementById('courts-listing-col');
    if (!listCol) return;

    try {
        const params = {};
        if (state.activeCity && state.activeCity !== 'all') params.city = state.activeCity;
        if (state.activeDistrict && state.activeDistrict !== 'all') params.district = state.activeDistrict;
        if (state.searchQuery) params.search = state.searchQuery;

        if (state.activeSport && state.activeSport !== 'all') {
            const sportMap = {
                'Футбол': 'FOOTBALL',
                'Баскетбол': 'BASKETBALL',
                'Волейбол': 'VOLLEYBALL',
                'Теннис': 'TENNIS'
            };
            params.sportType = sportMap[state.activeSport] || state.activeSport;
        }

        if (state.activePrice === '5000') params.maxPrice = 5000;
        if (state.activePrice === '8000') { params.minPrice = 5001; params.maxPrice = 8000; }
        if (state.activePrice === 'expensive') params.minPrice = 8001;

        listCol.innerHTML = '<div class="py-8 text-center text-text-muted text-xs">Алаңдар жүктелуде...</div>';
        const courts = await api.courts.list(params);

        if (!courts || courts.length === 0) {
            listCol.innerHTML = '<div class="bg-surface-default p-8 rounded-xl border border-surface-border text-center text-text-muted text-xs">Таңдалған критерийлер бойынша алаңдар табылмады</div>';
            return;
        }

        listCol.innerHTML = '';
        courts.forEach(court => {
            const card = document.createElement('div');
            card.className = 'court-item-card bg-surface-default border border-surface-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:border-primary hover:shadow-sm transition-all';

            const photo = (court.photoUrls && court.photoUrls.length > 0)
                ? court.photoUrls[0]
                : 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80';

            const name = escapeHtml(court.name);
            const sport = escapeHtml(court.sportType);
            const address = escapeHtml(court.address + (court.city ? ' (' + court.city + ')' : ''));
            const desc = escapeHtml(court.description || '');
            const price = Number(court.hourlyPrice || 0).toLocaleString('kk-KZ');

            let amenitiesHtml = '';
            if (court.amenities && Array.isArray(court.amenities)) {
                amenitiesHtml = court.amenities.slice(0, 3).map(a =>
                    \`<span class="px-2 py-0.5 rounded bg-slate-100 text-text-secondary text-[11px] font-medium">\${escapeHtml(a)}</span>\`
                ).join(' ');
            }

            card.innerHTML = \`
                <div class="w-full sm:w-48 h-36 rounded-lg bg-slate-200 overflow-hidden relative shrink-0">
                    <img src="\${escapeHtml(photo)}" alt="\${name}" class="w-full h-full object-cover" />
                    <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-default/90 text-primary text-[11px] font-bold">\${sport}</span>
                </div>
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="text-base font-bold text-text-primary">\${name}</h3>
                            <span class="text-sm font-bold text-primary shrink-0">\${price} ₸<span class="text-[11px] font-normal text-text-secondary">/сағ</span></span>
                        </div>
                        <p class="text-xs text-text-secondary flex items-center gap-1 mt-1">
                            <span class="material-symbols-outlined text-xs">location_on</span>
                            <span>\${address}</span>
                        </p>
                        <p class="text-xs text-text-muted mt-1.5 line-clamp-2">\${desc}</p>
                        <div class="flex flex-wrap gap-1 mt-2.5">\${amenitiesHtml}</div>
                    </div>
                    <div class="mt-3 pt-2 border-t border-surface-border flex items-center justify-end">
                        <button class="btn-book-court px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">Брондау</button>
                    </div>
                </div>
            \`;
            card.querySelector('.btn-book-court').addEventListener('click', () => openBooking(court.id));
            listCol.appendChild(card);
        });
    } catch (e) {
        handleApiError(e, 'Алаңдарды жүктеу сәтсіз аяқталды');
    }
}

function setCourtViewMode(mode) {
    state.viewMode = mode;
    const listCol = document.getElementById('courts-listing-col');
    const mapCol = document.getElementById('courts-map-col');
    const listBtn = document.getElementById('view-mode-list-btn');
    const splitBtn = document.getElementById('view-mode-split-btn');

    if (mode === 'list') {
        if (listCol) listCol.className = 'lg:col-span-12 space-y-4';
        if (mapCol) mapCol.classList.add('hidden');
        if (listBtn) listBtn.className = 'px-4 py-1.5 rounded-lg bg-surface-default text-text-primary text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all';
        if (splitBtn) splitBtn.className = 'px-4 py-1.5 rounded-lg text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-all';
    } else {
        if (listCol) listCol.className = 'lg:col-span-7 space-y-4';
        if (mapCol) mapCol.classList.remove('hidden');
        if (splitBtn) splitBtn.className = 'px-4 py-1.5 rounded-lg bg-surface-default text-text-primary text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all';
        if (listBtn) listBtn.className = 'px-4 py-1.5 rounded-lg text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-all';
    }
}

// ==========================================
// 9. BOOKING DETAILS & TIME SLOTS
// ==========================================
async function openBooking(courtId) {
    try {
        const court = await api.courts.get(courtId);
        state.selectedCourt = court;
        state.hourlyRate = Number(court.hourlyPrice || 0);
        state.selectedSlots = [];

        const courtNameEl = document.getElementById('booking-court-name');
        const summaryTitle = document.getElementById('summary-court-title');
        const summaryRate = document.getElementById('summary-rate');
        const descEl = document.getElementById('booking-court-desc');
        const amenitiesEl = document.getElementById('booking-court-amenities');

        if (courtNameEl) courtNameEl.textContent = \`\${court.name} (\${court.sportType})\`;
        if (summaryTitle) summaryTitle.textContent = court.name;
        if (summaryRate) summaryRate.textContent = state.hourlyRate.toLocaleString('kk-KZ') + ' ₸';
        if (descEl) descEl.textContent = court.description || 'Сипаттамасы жоқ';

        if (amenitiesEl) {
            amenitiesEl.innerHTML = '';
            if (court.amenities && Array.isArray(court.amenities)) {
                court.amenities.forEach(a => {
                    const span = document.createElement('span');
                    span.className = 'px-2.5 py-1 rounded-md bg-slate-100 text-text-secondary text-xs font-medium';
                    span.textContent = a;
                    amenitiesEl.appendChild(span);
                });
            }
        }

        initBookingDates();
        loadCourtReviews(court.id);
        switchView('booking');
    } catch (e) {
        handleApiError(e, 'Алаң ақпаратын жүктеу мүмкін болмады');
    }
}

function initBookingDates() {
    const container = document.getElementById('booking-date-container');
    if (!container) return;

    container.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 5; i++) {
        const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const isoDate = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const dayNum = d.getDate();
        const monthNamesKk = ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'];
        const dayLabel = (i === 0) ? 'Бүгін' : (i === 1) ? 'Ертең' : \`+\${i} күн\`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = (i === 0)
            ? 'date-chip p-2.5 rounded-xl border-2 border-primary bg-primary-soft text-primary font-semibold text-center transition-all'
            : 'date-chip p-2.5 rounded-xl border border-surface-border bg-surface-default text-text-primary hover:border-primary text-center transition-all';

        btn.innerHTML = \`
            <div class="text-[11px] uppercase tracking-wider">\${dayLabel}</div>
            <div class="text-sm font-bold mt-0.5">\${dayNum} \${monthNamesKk[d.getMonth()]}</div>
        \`;

        btn.addEventListener('click', () => selectBookingDate(btn, isoDate));
        container.appendChild(btn);

        if (i === 0) {
            state.selectedDate = isoDate;
            const summaryDate = document.getElementById('summary-date');
            if (summaryDate) summaryDate.textContent = formatDate(isoDate);
        }
    }

    if (state.selectedDate) {
        loadAvailability(state.selectedDate);
    }
}

function selectBookingDate(btnEl, dateISO) {
    state.selectedDate = dateISO;
    document.querySelectorAll('.date-chip').forEach(btn => {
        btn.className = 'date-chip p-2.5 rounded-xl border border-surface-border bg-surface-default text-text-primary hover:border-primary text-center transition-all';
    });
    btnEl.className = 'date-chip p-2.5 rounded-xl border-2 border-primary bg-primary-soft text-primary font-semibold text-center transition-all';

    const summaryDate = document.getElementById('summary-date');
    if (summaryDate) summaryDate.textContent = formatDate(dateISO);

    state.selectedSlots = [];
    recalcSummary();
    loadAvailability(dateISO);
}

async function loadAvailability(dateISO) {
    const slotsContainer = document.getElementById('booking-slots-container');
    if (!slotsContainer || !state.selectedCourt) return;

    try {
        slotsContainer.innerHTML = '<div class="col-span-full py-4 text-center text-text-muted text-xs">Уақыт слоттары тексерілуде...</div>';
        const activeBookings = await api.courts.availability(state.selectedCourt.id, dateISO);

        const opening = parseInt((state.selectedCourt.openingTime || '08:00:00').slice(0, 2), 10);
        const closing = parseInt((state.selectedCourt.closingTime || '23:00:00').slice(0, 2), 10);

        slotsContainer.innerHTML = '';
        for (let hour = opening; hour < closing; hour++) {
            const startH = String(hour).padStart(2, '0') + ':00';
            const endH = String(hour + 1).padStart(2, '0') + ':00';
            const timeRange = \`\${startH} - \${endH}\`;

            // Check if slot overlaps with an active booking
            const slotStart = new Date(\`\${dateISO}T\${startH}:00\`);
            const slotEnd = new Date(\`\${dateISO}T\${endH}:00\`);
            const now = new Date();

            const isPast = slotStart <= now;
            const isBooked = (activeBookings || []).some(b => {
                const bStart = new Date(b.startsAt);
                const bEnd = new Date(b.endsAt);
                return slotStart < bEnd && slotEnd > bStart;
            });

            if (isPast || isBooked) {
                const div = document.createElement('div');
                div.className = 'p-3 rounded-xl border border-surface-border bg-surface-secondary text-text-muted cursor-not-allowed';
                div.innerHTML = \`
                    <div class="text-sm font-medium line-through">\${timeRange}</div>
                    <div class="text-xs text-text-muted mt-1">\${isPast ? 'Өтіп кетті' : 'Брондалған'}</div>
                \`;
                slotsContainer.appendChild(div);
            } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'slot-btn p-3 rounded-xl border border-surface-border bg-surface-default hover:border-primary text-left transition-all';
                btn.innerHTML = \`
                    <div class="text-sm font-bold text-text-primary">\${timeRange}</div>
                    <div class="text-xs text-primary font-medium mt-1">Бос</div>
                \`;
                btn.addEventListener('click', () => toggleSlot(btn, timeRange));
                slotsContainer.appendChild(btn);
            }
        }
    } catch (e) {
        handleApiError(e, 'Қолжетімділік деректерін жүктеу сәтсіз аяқталды');
    }
}

function toggleSlot(buttonEl, timeRange) {
    const idx = state.selectedSlots.indexOf(timeRange);
    if (idx > -1) {
        state.selectedSlots.splice(idx, 1);
        buttonEl.className = 'slot-btn p-3 rounded-xl border border-surface-border bg-surface-default hover:border-primary text-left transition-all';
        buttonEl.innerHTML = \`
            <div class="text-sm font-bold text-text-primary">\${timeRange}</div>
            <div class="text-xs text-primary font-medium mt-1">Бос</div>
        \`;
    } else {
        state.selectedSlots.push(timeRange);
        state.selectedSlots.sort();
        buttonEl.className = 'slot-btn p-3 rounded-xl border-2 border-primary bg-primary text-white text-left transition-all';
        buttonEl.innerHTML = \`
            <div class="text-sm font-bold">\${timeRange}</div>
            <div class="text-xs text-white/90 font-medium mt-1">Таңдалды ✓</div>
        \`;
    }
    recalcSummary();
}

function recalcSummary() {
    const count = state.selectedSlots.length;
    state.totalPrice = count * state.hourlyRate;

    const slotsEl = document.getElementById('summary-slots');
    const hoursEl = document.getElementById('summary-hours');
    const totalEl = document.getElementById('summary-total');

    if (slotsEl) slotsEl.textContent = state.selectedSlots.length > 0 ? state.selectedSlots.join(', ') : 'Таңдалмады';
    if (hoursEl) hoursEl.textContent = \`\${count} сағат\`;
    if (totalEl) totalEl.textContent = state.totalPrice.toLocaleString('kk-KZ') + ' ₸';
}

async function confirmBookingAction() {
    if (state.currentRole === 'GUEST') {
        openLoginModal();
        showToast('Брондау үшін алдымен жүйеге кіріңіз', 'lock');
        return;
    }

    if (!state.selectedCourt || state.selectedSlots.length === 0 || !state.selectedDate) {
        showToast('Кемінде бір бос уақыт слотын таңдаңыз', 'warning');
        return;
    }

    // Determine contiguous start and end
    const firstSlot = state.selectedSlots[0];
    const lastSlot = state.selectedSlots[state.selectedSlots.length - 1];
    const startTimeStr = firstSlot.split(' - ')[0] + ':00';
    const endTimeStr = lastSlot.split(' - ')[1] + ':00';

    const startsAt = \`\${state.selectedDate}T\${startTimeStr}\`;
    const endsAt = \`\${state.selectedDate}T\${endTimeStr}\`;

    try {
        const booking = await api.bookings.create({
            courtId: state.selectedCourt.id,
            startsAt,
            endsAt
        });

        const modalInfo = document.getElementById('modal-court-info');
        if (modalInfo) {
            modalInfo.textContent = \`\${state.selectedCourt.name} • \${formatDate(state.selectedDate)} • \${state.selectedSlots.join(', ')}\`;
        }

        const successModal = document.getElementById('booking-success-modal');
        if (successModal) successModal.classList.remove('hidden');

        state.selectedSlots = [];
        recalcSummary();
        loadAvailability(state.selectedDate);
    } catch (err) {
        handleApiError(err, 'Брондау қатесі');
    }
}

function goToMyBookings() {
    const successModal = document.getElementById('booking-success-modal');
    if (successModal) successModal.classList.add('hidden');
    switchView('profile');
    switchProfileTab('bookings');
}

function closeSuccessModalAndGoHome() {
    const successModal = document.getElementById('booking-success-modal');
    if (successModal) successModal.classList.add('hidden');
    switchView('home');
}

// ==========================================
// 10. REVIEWS & RATINGS
// ==========================================
async function loadCourtReviews(courtId) {
    const listEl = document.getElementById('booking-reviews-list');
    const summaryEl = document.getElementById('booking-reviews-summary');
    if (!listEl) return;

    try {
        const [reviews, summary] = await Promise.all([
            api.courts.reviews(courtId),
            api.courts.reviewsSummary(courtId)
        ]);

        if (summaryEl) {
            const avg = summary && summary.averageRating ? summary.averageRating : 5.0;
            const count = summary && summary.reviewCount !== undefined ? summary.reviewCount : reviews.length;
            summaryEl.textContent = \`★ \${avg} (\${count} пікір)\`;
        }

        if (!reviews || reviews.length === 0) {
            listEl.innerHTML = '<p class="text-xs text-text-muted">Әзірге пікірлер жоқ. Сіз бірінші болып пікір қалдыра аласыз!</p>';
            return;
        }

        listEl.innerHTML = '';
        reviews.forEach(r => {
            const div = document.createElement('div');
            div.className = 'border-b border-surface-border pb-3 last:border-b-0';
            const stars = '★'.repeat(r.rating || 5);
            div.innerHTML = \`
                <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-bold text-text-primary">\${escapeHtml(r.author || 'Пайдаланушы')}</span>
                    <span class="text-amber-500 font-bold">\${stars}</span>
                </div>
                <p class="text-xs text-text-secondary leading-relaxed">\${escapeHtml(r.comment || '')}</p>
                <div class="text-[10px] text-text-muted mt-1">\${formatDate(r.createdAt)}</div>
            \`;
            listEl.appendChild(div);
        });
    } catch (e) {
        console.warn('Failed to load reviews:', e);
    }
}

function openReviewModalForCurrentCourt() {
    if (state.currentRole === 'GUEST') {
        openLoginModal();
        showToast('Пікір қалдыру үшін жүйеге кіріңіз', 'lock');
        return;
    }
    if (!state.selectedCourt) return;
    openReviewModal(state.selectedCourt.id, state.selectedCourt.name);
}

function openReviewModal(courtId, courtName) {
    const inputId = document.getElementById('review-court-id');
    const label = document.getElementById('review-court-name-label');
    const modal = document.getElementById('review-modal');
    if (inputId) inputId.value = courtId;
    if (label) label.textContent = courtName || 'Алаң';
    if (modal) modal.classList.remove('hidden');
    setReviewRating(5);
}

function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
}

function setReviewRating(rating) {
    state.reviewRating = rating;
    const hidden = document.getElementById('review-rating');
    if (hidden) hidden.value = rating;

    const stars = document.querySelectorAll('.review-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'review-star text-amber-400';
        } else {
            star.className = 'review-star text-slate-300';
        }
    });
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    const courtId = document.getElementById('review-court-id').value;
    const rating = parseInt(document.getElementById('review-rating').value, 10);
    const comment = document.getElementById('review-comment').value.trim();

    try {
        await api.courts.addReview(courtId, { rating, comment });
        closeReviewModal();
        showToast('Пікіріңіз сәтті сақталды!', 'check_circle');
        loadCourtReviews(courtId);
    } catch (err) {
        handleApiError(err, 'Пікір сақтау қатесі');
    }
}

// ==========================================
// 11. COMMUNITY GAMES
// ==========================================
async function loadGames() {
    const container = document.getElementById('games-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="col-span-full py-8 text-center text-text-muted text-xs">Ойындар жүктелуде...</div>';
        const games = await api.games.list();

        // Populate court select inside create game modal
        populateCourtSelectForGames();

        if (!games || games.length === 0) {
            container.innerHTML = '<div class="col-span-full bg-surface-default p-8 rounded-xl border border-surface-border text-center text-text-muted text-xs">Белсенді ойындар табылмады. Бірінші болып ойын ұйымдастырыңыз!</div>';
            return;
        }

        container.innerHTML = '';
        games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'bg-surface-default border border-surface-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all flex flex-col justify-between';

            const sport = escapeHtml(game.sportType);
            const title = escapeHtml(game.description || \`\${game.sportType} ойыны\`);
            const courtName = escapeHtml(game.courtName || 'Спорт алаңы');
            const timeStr = formatDateTime(game.startsAt);
            const currentPlayers = game.currentPlayers || (game.participants ? game.participants.length : 1);
            const maxPlayers = game.maxPlayers || 10;
            const spotsLeft = Math.max(0, maxPlayers - currentPlayers);
            const pct = Math.min(100, Math.round((currentPlayers / maxPlayers) * 100));

            const isParticipant = state.currentUser && game.participants && game.participants.some(p => p.id === state.currentUser.id);

            card.innerHTML = \`
                <div>
                    <div class="flex items-center justify-between">
                        <span class="px-2.5 py-1 rounded-md bg-primary-soft text-primary text-xs font-semibold">\${sport}</span>
                        <span class="text-xs text-text-muted">\${timeStr}</span>
                    </div>
                    <h3 class="text-base font-bold text-text-primary mt-3">\${title}</h3>
                    <p class="text-xs text-text-secondary flex items-center gap-1 mt-1">
                        <span class="material-symbols-outlined text-sm">stadium</span>
                        <span>\${courtName}</span>
                    </p>
                    <div class="mt-4">
                        <div class="flex justify-between text-xs mb-1.5">
                            <span class="text-text-secondary">Қатысушылар:</span>
                            <span class="font-bold text-primary">\${currentPlayers} / \${maxPlayers} (\${spotsLeft > 0 ? spotsLeft + ' орын қалды' : 'Орын жоқ'})</span>
                        </div>
                        <div class="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all duration-300" style="width: \${pct}%"></div>
                        </div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                    <span class="text-xs text-text-secondary font-medium">Ашық ойын</span>
                    <button class="btn-game-action px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all \${isParticipant ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-primary text-white hover:bg-primary-hover'}">
                        \${isParticipant ? 'Шығу' : 'Қосылу'}
                    </button>
                </div>
            \`;

            const btn = card.querySelector('.btn-game-action');
            btn.addEventListener('click', async () => {
                if (state.currentRole === 'GUEST') {
                    openLoginModal();
                    showToast('Ойынға қатысу үшін жүйеге кіріңіз', 'lock');
                    return;
                }
                try {
                    if (isParticipant) {
                        await api.games.leave(game.id);
                        showToast('Ойыннан шықтыңыз', 'info');
                    } else {
                        await api.games.join(game.id);
                        showToast('Ойынға сәтті тіркелдіңіз!', 'check_circle');
                    }
                    loadGames();
                } catch (err) {
                    handleApiError(err);
                }
            });

            container.appendChild(card);
        });
    } catch (e) {
        handleApiError(e, 'Ойындарды жүктеу сәтсіз аяқталды');
    }
}

async function populateCourtSelectForGames() {
    const select = document.getElementById('input-game-court');
    if (!select || select.dataset.loaded === 'true') return;

    try {
        const courts = await api.courts.list();
        select.innerHTML = '<option value="">Алаңды таңдаңыз...</option>';
        courts.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = \`\${c.name} (\${c.sportType}, \${c.city})\`;
            select.appendChild(opt);
        });
        select.dataset.loaded = 'true';
    } catch (e) {
        console.warn('Could not load courts for game creation:', e);
    }
}

function openCreateGameModal() {
    if (state.currentRole === 'GUEST') {
        openLoginModal();
        showToast('Ойын ұйымдастыру үшін жүйеге кіріңіз', 'lock');
        return;
    }
    const modal = document.getElementById('create-game-modal');
    if (modal) modal.classList.remove('hidden');

    const dateInput = document.getElementById('input-game-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
    populateCourtSelectForGames();
}

function closeCreateGameModal() {
    const modal = document.getElementById('create-game-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleCreateGameSubmit(event) {
    event.preventDefault();
    const courtId = document.getElementById('input-game-court').value;
    const sportType = document.getElementById('input-game-sport').value;
    const maxPlayers = parseInt(document.getElementById('input-game-max').value, 10);
    const date = document.getElementById('input-game-date').value;
    const time = document.getElementById('input-game-time').value;
    const description = document.getElementById('input-game-title').value.trim();

    if (!courtId || !date || !time) {
        showToast('Барлық өрістерді толтырыңыз', 'warning');
        return;
    }

    const startsAt = \`\${date}T\${time}:00\`;

    try {
        await api.games.create({
            courtId,
            sportType,
            startsAt,
            maxPlayers,
            description
        });
        closeCreateGameModal();
        showToast('Ойын сәтті құрылды!', 'check_circle');
        loadGames();
    } catch (err) {
        handleApiError(err, 'Ойын құру қатесі');
    }
}

// ==========================================
// 12. USER PROFILE
// ==========================================
async function loadProfile() {
    try {
        const profile = await api.profile.get();

        const pName = document.getElementById('profile-page-name');
        const pRole = document.getElementById('profile-page-role');
        const pEmail = document.getElementById('profile-page-email');
        const settingsInput = document.getElementById('profile-settings-name');

        if (pName) pName.textContent = profile.fullName;
        if (pRole) pRole.textContent = profile.role;
        if (pEmail) pEmail.textContent = profile.email;
        if (settingsInput) settingsInput.value = profile.fullName;

        // Render Bookings Tab
        const bookingsList = document.getElementById('profile-bookings-list');
        const bookingsTabBtn = document.getElementById('profile-tab-bookings');
        const bookings = profile.bookings || [];

        if (bookingsTabBtn) {
            bookingsTabBtn.textContent = \`Менің броньдарым (\${bookings.length})\`;
        }

        if (bookingsList) {
            if (bookings.length === 0) {
                bookingsList.innerHTML = '<div class="p-8 text-center text-text-muted text-xs bg-surface-default rounded-xl border border-surface-border">Әзірге броньдар жоқ</div>';
            } else {
                bookingsList.innerHTML = '';
                bookings.forEach(b => {
                    const card = document.createElement('div');
                    card.className = 'bg-surface-default border border-surface-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4';

                    const statusColors = {
                        PENDING: 'bg-amber-100 text-amber-800',
                        CONFIRMED: 'bg-primary-soft text-primary',
                        CANCELLED: 'bg-red-100 text-red-700',
                        COMPLETED: 'bg-slate-200 text-slate-700'
                    };
                    const colorClass = statusColors[b.status] || 'bg-slate-100 text-slate-700';
                    const canCancel = (b.status === 'PENDING' || b.status === 'CONFIRMED');
                    const isCompleted = (b.status === 'COMPLETED');

                    card.innerHTML = \`
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-2xl">stadium</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2.5">
                                    <h3 class="text-base font-bold text-text-primary">\${escapeHtml(b.courtName || 'Алаң')}</h3>
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold \${colorClass}">
                                        \${escapeHtml(b.status)}
                                    </span>
                                </div>
                                <p class="text-xs text-text-secondary mt-1">\${formatDateTime(b.startsAt)} — \${formatDateTime(b.endsAt)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            \${canCancel ? \`<button class="btn-cancel-booking px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors">Бас тарту</button>\` : ''}
                            \${isCompleted ? \`<button class="btn-review-booking px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">Пікір жазу</button>\` : ''}
                        </div>
                    \`;

                    const cancelBtn = card.querySelector('.btn-cancel-booking');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', () => cancelBooking(b.id));
                    }
                    const revBtn = card.querySelector('.btn-review-booking');
                    if (revBtn) {
                        revBtn.addEventListener('click', () => openReviewModal(b.courtId, b.courtName));
                    }

                    bookingsList.appendChild(card);
                });
            }
        }

        // Render Games Tab
        const gamesList = document.getElementById('profile-games-list');
        const games = profile.games || [];
        if (gamesList) {
            if (games.length === 0) {
                gamesList.innerHTML = '<div class="p-8 text-center text-text-muted text-xs bg-surface-default rounded-xl border border-surface-border">Қатысқан ойындарыңыз жоқ</div>';
            } else {
                gamesList.innerHTML = '';
                games.forEach(g => {
                    const card = document.createElement('div');
                    card.className = 'bg-surface-default border border-surface-border rounded-xl p-5';
                    card.innerHTML = \`
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-bold text-text-primary">\${escapeHtml(g.description || g.sportType)}</h3>
                            <span class="text-xs text-primary font-semibold">\${escapeHtml(g.status)}</span>
                        </div>
                        <p class="text-xs text-text-secondary mt-1">\${escapeHtml(g.courtName || '')} • \${formatDateTime(g.startsAt)}</p>
                    \`;
                    gamesList.appendChild(card);
                });
            }
        }
    } catch (e) {
        handleApiError(e, 'Профильді жүктеу қатесі');
    }
}

function switchProfileTab(tabName) {
    state.profileTab = tabName;
    ['bookings', 'games', 'settings'].forEach(t => {
        const btn = document.getElementById('profile-tab-' + t);
        const content = document.getElementById('tab-content-' + t);
        if (t === tabName) {
            if (btn) btn.className = 'border-b-2 border-primary text-primary text-xs font-bold pb-3';
            if (content) content.classList.remove('hidden');
        } else {
            if (btn) btn.className = 'text-text-secondary hover:text-text-primary text-xs pb-3 transition-colors';
            if (content) content.classList.add('hidden');
        }
    });
}

async function cancelBooking(bookingId) {
    if (!confirm('Броньнан бас тартуды растайсыз ба?')) return;
    try {
        await api.bookings.updateStatus(bookingId, 'CANCELLED');
        showToast('Бронь сәтті жойылды', 'cancel');
        loadProfile();
    } catch (err) {
        handleApiError(err, 'Броньды жою сәтсіз');
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const fullName = document.getElementById('profile-settings-name').value.trim();
    if (!fullName) return;

    try {
        const updated = await api.profile.update({ fullName });
        if (state.currentUser) state.currentUser.fullName = updated.fullName;
        updateUIForRole();
        showToast('Профиль өзгерістері сақталды!', 'check_circle');
    } catch (err) {
        handleApiError(err, 'Профильді жаңарту қатесі');
    }
}

// ==========================================
// 13. VENUE OWNER DASHBOARD
// ==========================================
async function loadOwnerDashboard() {
    if (state.currentRole !== 'OWNER' && state.currentRole !== 'ADMIN') return;

    try {
        const [summary, courts, bookings] = await Promise.all([
            api.owner.summary(),
            api.owner.courts(),
            api.owner.bookings()
        ]);

        // Update KPI metrics
        const kpiPending = document.getElementById('kpi-pending-count');
        if (kpiPending) kpiPending.textContent = summary.pendingBookings !== undefined ? summary.pendingBookings : 0;

        // Render Owner Courts
        const courtsContainer = document.getElementById('owner-courts-list');
        if (courtsContainer) {
            if (!courts || courts.length === 0) {
                courtsContainer.innerHTML = '<div class="col-span-full p-6 text-center text-text-muted text-xs bg-surface-default rounded-xl border border-surface-border">Әзірге алаңдарыңыз жоқ. «Жаңа алаң қосу» батырмасын басыңыз!</div>';
            } else {
                courtsContainer.innerHTML = '';
                courts.forEach(c => {
                    const card = document.createElement('div');
                    card.className = 'bg-surface-default p-4 rounded-xl border border-surface-border shadow-sm flex flex-col justify-between';
                    const statusClass = (c.status === 'APPROVED') ? 'bg-primary-soft text-primary' : (c.status === 'PENDING') ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';

                    card.innerHTML = \`
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="px-2 py-0.5 rounded text-[11px] font-bold \${statusClass}">\${escapeHtml(c.status)}</span>
                                <span class="text-xs text-primary font-semibold">\${Number(c.hourlyPrice || 0).toLocaleString('kk-KZ')} ₸/сағ</span>
                            </div>
                            <h3 class="text-sm font-bold text-text-primary">\${escapeHtml(c.name)}</h3>
                            <p class="text-xs text-text-secondary mt-1">\${escapeHtml(c.city)} • \${escapeHtml(c.address)}</p>
                        </div>
                    \`;
                    courtsContainer.appendChild(card);
                });
            }
        }

        // Render Bookings Table
        const tbody = document.getElementById('owner-bookings-tbody');
        if (tbody) {
            if (!bookings || bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-text-muted text-xs">Брондаулар табылмады</td></tr>';
            } else {
                tbody.innerHTML = '';
                bookings.forEach(b => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50 transition-colors';

                    const statusClass = (b.status === 'CONFIRMED') ? 'bg-primary-soft text-primary' : (b.status === 'PENDING') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-text-muted';
                    const canConfirm = b.status === 'PENDING';
                    const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
                    const canComplete = b.status === 'CONFIRMED';

                    tr.innerHTML = \`
                        <td class="px-5 py-4 font-semibold text-text-primary">\${escapeHtml(b.userName || 'Клиент')}</td>
                        <td class="px-5 py-4 text-text-primary">\${escapeHtml(b.courtName || '')}</td>
                        <td class="px-5 py-4 text-text-secondary">\${formatDateTime(b.startsAt)} — \${formatDateTime(b.endsAt)}</td>
                        <td class="px-5 py-4 font-bold text-text-primary">—</td>
                        <td class="px-5 py-4">
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold \${statusClass}">
                                \${escapeHtml(b.status)}
                            </span>
                        </td>
                        <td class="px-5 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                \${canConfirm ? \`<button class="btn-owner-confirm px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">Растау</button>\` : ''}
                                \${canComplete ? \`<button class="btn-owner-complete px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">Аяқтау</button>\` : ''}
                                \${canCancel ? \`<button class="btn-owner-reject px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors">Бас тарту</button>\` : ''}
                            </div>
                        </td>
                    \`;

                    const confirmBtn = tr.querySelector('.btn-owner-confirm');
                    if (confirmBtn) confirmBtn.addEventListener('click', () => ownerUpdateBookingStatus(b.id, 'CONFIRMED'));
                    const completeBtn = tr.querySelector('.btn-owner-complete');
                    if (completeBtn) completeBtn.addEventListener('click', () => ownerUpdateBookingStatus(b.id, 'COMPLETED'));
                    const rejectBtn = tr.querySelector('.btn-owner-reject');
                    if (rejectBtn) rejectBtn.addEventListener('click', () => ownerUpdateBookingStatus(b.id, 'CANCELLED'));

                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        handleApiError(e, 'Алаң иесі панелін жүктеу қатесі');
    }
}

async function ownerUpdateBookingStatus(bookingId, status) {
    try {
        await api.bookings.updateStatus(bookingId, status);
        showToast(\`Бронь күйі жаңартылды: \${status}\`, 'check_circle');
        loadOwnerDashboard();
    } catch (err) {
        handleApiError(err);
    }
}

function openNewCourtModal() {
    const modal = document.getElementById('new-court-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeNewCourtModal() {
    const modal = document.getElementById('new-court-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleNewCourtSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('new-court-name').value.trim();
    const sportType = document.getElementById('new-court-sport').value;
    const hourlyPrice = parseFloat(document.getElementById('new-court-price').value);
    const city = document.getElementById('new-court-city').value.trim();
    const district = document.getElementById('new-court-district').value.trim();
    const address = document.getElementById('new-court-address').value.trim();
    const openingTime = document.getElementById('new-court-open').value + ':00';
    const closingTime = document.getElementById('new-court-close').value + ':00';
    const description = document.getElementById('new-court-desc').value.trim();

    try {
        await api.owner.createCourt({
            name,
            sportType,
            hourlyPrice,
            city,
            district,
            address,
            openingTime,
            closingTime,
            description,
            amenities: ['Жарықтандыру', 'Шешінетін бөлме', 'Душ'],
            photoUrls: ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80']
        });

        closeNewCourtModal();
        showToast('Алаң модерацияға жіберілді!', 'check_circle');
        loadOwnerDashboard();
    } catch (err) {
        handleApiError(err, 'Алаң қосу қатесі');
    }
}

// ==========================================
// 14. ADMIN PANEL (SUPERADMIN)
// ==========================================
async function loadAdminDashboard() {
    if (state.currentRole !== 'ADMIN') return;

    try {
        const [summary, pendingCourts, pendingGames, users] = await Promise.all([
            api.admin.summary(),
            api.admin.courts('PENDING'),
            api.admin.games('PENDING'),
            api.admin.users()
        ]);

        const modCount = document.getElementById('admin-mod-count');
        if (modCount) modCount.textContent = (pendingCourts.length + pendingGames.length);

        // Courts Moderation Queue
        const courtsQueue = document.getElementById('admin-courts-queue');
        if (courtsQueue) {
            if (pendingCourts.length === 0) {
                courtsQueue.innerHTML = '<div class="p-5 text-center text-text-muted text-xs">Модерацияны күтіп тұрған алаңдар жоқ ✓</div>';
            } else {
                courtsQueue.innerHTML = '';
                pendingCourts.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors';
                    item.innerHTML = \`
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">stadium</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-xs font-bold text-text-primary">\${escapeHtml(c.name)} (\${escapeHtml(c.city)})</h3>
                                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">Жаңа алаң</span>
                                </div>
                                <div class="text-xs text-text-secondary mt-1">\${escapeHtml(c.address)} • \${Number(c.hourlyPrice || 0).toLocaleString('kk-KZ')} ₸/сағ</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-start sm:self-center">
                            <button class="btn-approve-court px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">Бекіту</button>
                            <button class="btn-reject-court px-3.5 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:text-red-600 text-xs font-semibold transition-colors">Қайтару</button>
                        </div>
                    \`;
                    item.querySelector('.btn-approve-court').addEventListener('click', () => adminUpdateCourtStatus(c.id, 'APPROVED'));
                    item.querySelector('.btn-reject-court').addEventListener('click', () => adminUpdateCourtStatus(c.id, 'REJECTED'));
                    courtsQueue.appendChild(item);
                });
            }
        }

        // Games Moderation Queue
        const gamesQueue = document.getElementById('admin-games-queue');
        if (gamesQueue) {
            if (pendingGames.length === 0) {
                gamesQueue.innerHTML = '<div class="p-5 text-center text-text-muted text-xs">Модерацияны күтіп тұрған ойындар жоқ ✓</div>';
            } else {
                gamesQueue.innerHTML = '';
                pendingGames.forEach(g => {
                    const item = document.createElement('div');
                    item.className = 'p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors';
                    item.innerHTML = \`
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">sports_soccer</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-xs font-bold text-text-primary">\${escapeHtml(g.description || g.sportType)}</h3>
                                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">Жаңа ойын</span>
                                </div>
                                <div class="text-xs text-text-secondary mt-1">\${escapeHtml(g.courtName || '')} • \${formatDateTime(g.startsAt)}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-start sm:self-center">
                            <button class="btn-approve-game px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">Бекіту</button>
                            <button class="btn-reject-game px-3.5 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:text-red-600 text-xs font-semibold transition-colors">Қайтару</button>
                        </div>
                    \`;
                    item.querySelector('.btn-approve-game').addEventListener('click', () => adminUpdateGameStatus(g.id, 'APPROVED'));
                    item.querySelector('.btn-reject-game').addEventListener('click', () => adminUpdateGameStatus(g.id, 'REJECTED'));
                    gamesQueue.appendChild(item);
                });
            }
        }

        // Users Management
        const usersTbody = document.getElementById('admin-users-tbody');
        if (usersTbody) {
            usersTbody.innerHTML = '';
            (users || []).forEach(u => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                const isCurrent = state.currentUser && state.currentUser.email === u.email;

                tr.innerHTML = \`
                    <td class="px-5 py-3 font-semibold text-text-primary">\${escapeHtml(u.fullName)}</td>
                    <td class="px-5 py-3 text-text-secondary">\${escapeHtml(u.email)}</td>
                    <td class="px-5 py-3 font-semibold text-primary">\${escapeHtml(u.role)}</td>
                    <td class="px-5 py-3 text-right">
                        \${isCurrent ? '<span class="text-xs text-text-muted">Ағымдағы админ</span>' : \`
                            <select class="user-role-select text-xs px-2.5 py-1 rounded-lg border border-surface-border bg-white focus:ring-1 focus:ring-primary">
                                <option value="PLAYER" \${u.role === 'PLAYER' ? 'selected' : ''}>PLAYER</option>
                                <option value="OWNER" \${u.role === 'OWNER' ? 'selected' : ''}>OWNER</option>
                            </select>
                        \`}
                    </td>
                \`;

                const select = tr.querySelector('.user-role-select');
                if (select) {
                    select.addEventListener('change', (e) => adminUpdateUserRole(u.id, e.target.value));
                }

                usersTbody.appendChild(tr);
            });
        }
    } catch (e) {
        handleApiError(e, 'Әкімші панелін жүктеу қатесі');
    }
}

async function adminUpdateCourtStatus(courtId, status) {
    try {
        await api.admin.updateCourtStatus(courtId, status);
        showToast(\`Алаң күйі: \${status}\`, 'check_circle');
        loadAdminDashboard();
    } catch (err) {
        handleApiError(err);
    }
}

async function adminUpdateGameStatus(gameId, status) {
    try {
        await api.admin.updateGameStatus(gameId, status);
        showToast(\`Ойын күйі: \${status}\`, 'check_circle');
        loadAdminDashboard();
    } catch (err) {
        handleApiError(err);
    }
}

async function adminUpdateUserRole(userId, newRole) {
    try {
        await api.admin.updateUserRole(userId, newRole);
        showToast(\`Пайдаланушы рөлі \${newRole} болып өзгертілді\`, 'check_circle');
        loadAdminDashboard();
    } catch (err) {
        handleApiError(err);
    }
}

// ==========================================
// 15. UI HELPERS & TOASTS
// ==========================================
function toggleUserMenu() {
    const m = document.getElementById('user-dropdown-menu');
    if (m) m.classList.toggle('hidden');
}

function closeUserMenu() {
    const m = document.getElementById('user-dropdown-menu');
    if (m) m.classList.add('hidden');
}

function openLoginModal() {
    const m = document.getElementById('login-modal');
    if (m) m.classList.remove('hidden');
    switchAuthTab('login');
}

function closeLoginModal() {
    const m = document.getElementById('login-modal');
    if (m) m.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    const container = document.getElementById('user-menu-container');
    if (container && !container.contains(e.target)) {
        closeUserMenu();
    }
});

let toastTimer;
function showToast(message, icon = 'check_circle') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');
    if (!toast || !msg) return;

    msg.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hideToast(), 4000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.classList.add('hidden');
}

// ==========================================
// 16. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (state.currentLang !== 'kk') {
        setLanguage(state.currentLang);
    }
    loadHomeData();
});
`;

fs.writeFileSync('src/main/resources/static/app.js', i18nContent + '\n\n' + appLogic);
console.log('Successfully wrote app.js!');
