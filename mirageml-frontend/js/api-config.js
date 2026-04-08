const API_BASE_URL = (() => {
    if (window.API_URL) return window.API_URL;
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
        return 'http://localhost:3001';
    }
    return 'https://mirageml.onrender.com';
})();

window.API_CONFIG = { baseUrl: API_BASE_URL };
window.API_URL = API_BASE_URL;

function getApiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    if (typeof url === 'string') {
        url = url.replace(/https?:\/\/localhost:3001/g, API_BASE_URL);
    }
    return originalFetch.call(this, url, options);
};