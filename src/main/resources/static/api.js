/**
 * PlaySlot API Client Layer
 * Handles CSRF token extraction, credentials, JSON payloads, and error translation.
 */
class ApiError extends Error {
    constructor(status, data, message) {
        super(message || (data && (data.error || data.message)) || `HTTP ${status}`);
        this.status = status;
        this.data = data;
    }
}

function getCsrfTokenFromCookie() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken() {
    let token = getCsrfTokenFromCookie();
    if (!token) {
        try {
            await fetch('/api/auth/csrf', {
                method: 'GET',
                credentials: 'include'
            });
            token = getCsrfTokenFromCookie();
        } catch (e) {
            console.warn('[PlaySlot API] Unable to pre-fetch CSRF token:', e);
        }
    }
    return token;
}

async function apiRequest(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) {
            headers['X-XSRF-TOKEN'] = csrfToken;
        }
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
    }

    let response;
    try {
        response = await fetch(endpoint, {
            credentials: 'include',
            ...options,
            method,
            headers
        });
    } catch (networkError) {
        throw new ApiError(0, null, 'Network error. Please check your internet connection.');
    }

    if (response.status === 204) {
        return null;
    }

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }
    } else {
        const text = await response.text();
        data = text ? { message: text } : null;
    }

    if (!response.ok) {
        throw new ApiError(response.status, data);
    }

    return data;
}

const api = {
    csrf: () => apiRequest('/api/auth/csrf'),
    auth: {
        me: () => apiRequest('/api/auth/me'),
        login: (credentials) => apiRequest('/api/auth/login', { method: 'POST', body: credentials }),
        register: (userData) => apiRequest('/api/auth/register', { method: 'POST', body: userData }),
        logout: () => apiRequest('/api/auth/logout', { method: 'POST' })
    },
    courts: {
        list: (params = {}) => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'Барлығы') {
                    query.append(k, v);
                }
            });
            const qStr = query.toString();
            return apiRequest(`/api/courts${qStr ? '?' + qStr : ''}`);
        },
        get: (id) => apiRequest(`/api/courts/${id}`),
        availability: (courtId, date) => apiRequest(`/api/courts/${courtId}/availability?date=${encodeURIComponent(date)}`),
        reviews: (courtId) => apiRequest(`/api/courts/${courtId}/reviews`),
        reviewsSummary: (courtId) => apiRequest(`/api/courts/${courtId}/reviews/summary`),
        addReview: (courtId, review) => apiRequest(`/api/courts/${courtId}/reviews`, { method: 'POST', body: review })
    },
    bookings: {
        create: (booking) => apiRequest('/api/bookings', { method: 'POST', body: booking }),
        mine: () => apiRequest('/api/bookings/mine'),
        updateStatus: (id, status) => apiRequest(`/api/bookings/${id}/status`, { method: 'PUT', body: { status } })
    },
    games: {
        list: () => apiRequest('/api/games'),
        create: (game) => apiRequest('/api/games', { method: 'POST', body: game }),
        join: (id) => apiRequest(`/api/games/${id}/join`, { method: 'POST' }),
        leave: (id) => apiRequest(`/api/games/${id}/leave`, { method: 'POST' })
    },
    teams: {
        list: () => apiRequest('/api/teams'),
        mine: () => apiRequest('/api/teams/mine'),
        create: (team) => apiRequest('/api/teams', { method: 'POST', body: team }),
        join: (id) => apiRequest(`/api/teams/${id}/join`, { method: 'POST' }),
        leave: (id) => apiRequest(`/api/teams/${id}/leave`, { method: 'POST' })
    },
    profile: {
        get: () => apiRequest('/api/profile'),
        update: (profileData) => apiRequest('/api/profile', { method: 'PUT', body: profileData })
    },
    owner: {
        summary: () => apiRequest('/api/owner/courts/summary'),
        courts: () => apiRequest('/api/owner/courts'),
        createCourt: (courtData) => apiRequest('/api/owner/courts', { method: 'POST', body: courtData }),
        updateCourt: (id, courtData) => apiRequest(`/api/owner/courts/${id}`, { method: 'PUT', body: courtData }),
        bookings: () => apiRequest('/api/owner/bookings')
    },
    admin: {
        summary: () => apiRequest('/api/admin/summary'),
        courts: (status = 'PENDING') => apiRequest(`/api/admin/courts?status=${status}`),
        updateCourtStatus: (id, status) => apiRequest(`/api/admin/courts/${id}/status`, { method: 'PATCH', body: { status } }),
        games: (status = 'PENDING') => apiRequest(`/api/admin/games?status=${status}`),
        updateGameStatus: (id, status) => apiRequest(`/api/admin/games/${id}/status`, { method: 'PATCH', body: { status } }),
        bookings: () => apiRequest('/api/admin/bookings'),
        users: () => apiRequest('/api/admin/users'),
        updateUserRole: (id, role) => apiRequest(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } })
    },
    home: () => apiRequest('/api/home'),
    health: () => apiRequest('/api/health/database')
};

// Export to window for vanilla SPA
window.api = api;
window.ApiError = ApiError;
