/**
 * MirageML Editor API Client
 * Модуль для работы с бекендом MirageML
 */

// Используем тот же домен (для editor это будет localhost:3001)
const API_BASE_URL = window.location.origin;

// Состояние авторизации
let authState = {
    isAuthenticated: false,
    user: null,
    token: null,
    currentProject: null
};

// =============================================
// Функции авторизации
// =============================================

/**
 * Проверка авторизации пользователя
 */
async function checkAuth() {
    try {
        // Пробуем получить токен из localStorage или sessionStorage (ключ 'token' для совместимости)
        let token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Для отладки
        console.log('[API] checkAuth - token из storage:', token ? token.substring(0, 20) + '...' : 'не найден');
        console.log('[API] checkAuth - localStorage token:', localStorage.getItem('token') ? 'есть' : 'нет');
        console.log('[API] checkAuth - sessionStorage token:', sessionStorage.getItem('token') ? 'есть' : 'нет');

        if (!token) {
            authState.isAuthenticated = false;
            authState.user = null;
            authState.token = null;
            console.log('[API] checkAuth - токен не найден, пользователь не авторизован');
            return false;
        }

        // Если токен есть, но authState пуст, восстанавливаем
        if (token && !authState.token) {
            authState.token = token;
            console.log('[API] checkAuth - токен восстановлен из storage');
        }

        const response = await fetchWithAuth('/api/profile');
        console.log('[API] checkAuth - /api/profile status:', response.status);

        if (response.ok) {
            const user = await response.json();
            authState.isAuthenticated = true;
            authState.user = user;
            console.log('[API] checkAuth - пользователь авторизован:', user.name);
            return true;
        } else {
            // Токен невалиден
            authState.isAuthenticated = false;
            authState.user = null;
            authState.token = null;
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            console.log('[API] checkAuth - токен невалиден (status:', response.status, ')');
            return false;
        }
    } catch (error) {
        console.error('[API] Ошибка проверки авторизации:', error);
        authState.isAuthenticated = false;
        authState.user = null;
        authState.token = null;
        return false;
    }
}

/**
 * Вход пользователя
 */
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authState.isAuthenticated = true;
            authState.user = data.user;
            authState.token = data.token;

            // Сохраняем токен в localStorage и sessionStorage (ключ 'token' для совместимости)
            localStorage.setItem('token', data.token);
            sessionStorage.setItem('token', data.token);

            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('[API] Ошибка входа:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

/**
 * Регистрация пользователя
 */
async function register(name, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Автоматический вход после регистрации
            return await login(email, password);
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('[API] Ошибка регистрации:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

/**
 * Выход пользователя
 */
function logout() {
    authState.isAuthenticated = false;
    authState.user = null;
    authState.token = null;
    authState.currentProject = null;

    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentProjectId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');

    // Перенаправление на главную
    window.location.href = '/';
}

// =============================================
// Функции работы с проектами
// =============================================

/**
 * Получить список проектов пользователя
 */
async function getProjects() {
    try {
        const response = await fetchWithAuth('/api/projects');
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки проектов');
        }
        
        return await response.json();
    } catch (error) {
        console.error('[API] Ошибка загрузки проектов:', error);
        return [];
    }
}

/**
 * Получить проект по ID
 */
async function getProject(projectId) {
    try {
        const response = await fetchWithAuth(`/api/projects/${projectId}`);
        
        if (!response.ok) {
            throw new Error('Проект не найден');
        }
        
        return await response.json();
    } catch (error) {
        console.error('[API] Ошибка загрузки проекта:', error);
        return null;
    }
}

/**
 * Создать новый проект
 */
async function createProject(name = 'Новый проект') {
    try {
        const response = await fetchWithAuth('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (response.ok) {
            authState.currentProject = data.project;
            localStorage.setItem('currentProjectId', data.project.id);
            return { success: true, project: data.project };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('[API] Ошибка создания проекта:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

/**
 * Сохранить проект (обновить или создать)
 */
async function saveProject(sections, canvasSize = { width: 800, height: 600 }) {
    try {
        console.log('[API] saveProject - сохраняем проект:', authState.currentProject ? 'обновление' : 'создание');
        console.log('[API] saveProject - количество секций:', sections.length);

        // Собираем данные элементов из DOM
        const elements = {};
        sections.forEach((section, index) => {
            const clone = section.element.cloneNode(true);
            clone.querySelector('.section-controls')?.remove();
            clone.querySelectorAll('.resize-handle, .rotate-handle, .rotate-line').forEach(el => el.remove());
            clone.classList.remove('selected', 'canvas-section');
            clone.style.border = 'none';
            clone.style.boxShadow = 'none';

            elements[section.id] = {
                html: clone.outerHTML,
                css: section.css,
                name: section.name,
                order: index
            };
        });

        console.log('[API] saveProject - элементы собраны:', Object.keys(elements).length);

        const projectData = {
            elements,
            canvas_size: canvasSize
        };

        let response;

        if (authState.currentProject) {
            // Обновляем существующий проект
            console.log('[API] saveProject - PUT /api/projects/' + authState.currentProject.id);
            response = await fetchWithAuth(`/api/projects/${authState.currentProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
        } else {
            // Создаём новый проект с элементами
            console.log('[API] saveProject - POST /api/projects (с элементами)');
            response = await fetchWithAuth('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Проект от ' + new Date().toLocaleDateString('ru-RU'),
                    ...projectData  // Передаём elements и canvas_size
                })
            });
        }

        const data = await response.json();
        console.log('[API] saveProject - ответ сервера:', response.status, data);

        if (response.ok) {
            if (!authState.currentProject && data.project) {
                authState.currentProject = data.project;
                localStorage.setItem('currentProjectId', data.project.id);
            }
            return { success: true, project: data.project };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('[API] Ошибка сохранения проекта:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

/**
 * Загрузить проект
 */
async function loadProject(projectId) {
    try {
        const project = await getProject(projectId);
        
        if (project) {
            authState.currentProject = project;
            localStorage.setItem('currentProjectId', projectId);
            return project;
        }
        
        return null;
    } catch (error) {
        console.error('[API] Ошибка загрузки проекта:', error);
        return null;
    }
}

/**
 * Удалить проект
 */
async function deleteProject(projectId) {
    try {
        const response = await fetchWithAuth(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            if (authState.currentProject?.id === projectId) {
                authState.currentProject = null;
                localStorage.removeItem('currentProjectId');
            }
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('[API] Ошибка удаления проекта:', error);
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

// =============================================
// Вспомогательные функции
// =============================================

/**
 * Получить cookie по имени
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * Fetch с авторизацией
 */
async function fetchWithAuth(url, options = {}) {
    const token = authState.token || getCookie('authToken');
    
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : ''
    };

    return fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });
}

/**
 * Получить текущего пользователя
 */
function getCurrentUser() {
    return authState.user;
}

/**
 * Проверка авторизации (синхронная)
 */
function isAuthenticated() {
    return authState.isAuthenticated;
}

/**
 * Получить текущий проект
 */
function getCurrentProject() {
    return authState.currentProject;
}

// Экспорт функций
window.MirageMLAPI = {
    checkAuth,
    login,
    register,
    logout,
    getProjects,
    getProject,
    createProject,
    saveProject,
    loadProject,
    deleteProject,
    getCurrentUser,
    isAuthenticated,
    getCurrentProject,
    fetchWithAuth,
    authState  // Экспортируем для отладки
};
