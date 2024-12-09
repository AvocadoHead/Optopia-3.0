import { API_BASE_URL } from './api-service.js';
import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';

let currentLang = getCurrentLang();
document.documentElement.lang = currentLang;

// Language toggle functionality
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    updateLanguageDisplay();
    
    const langToggle = document.getElementById('language-toggle');
    langToggle.textContent = currentLang === 'he' ? 'EN' : 'עב';
};

function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        if (el.getAttribute('data-lang') === currentLang) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = getLangText(message);
    errorDiv.classList.add('visible');
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.remove('visible');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    hideError();
    
    let username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    // Normalize username by removing hyphens
    username = username.replace(/-/g, '');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Login failed');
        }

        const data = await response.json();
        
        // Store the session token and member ID
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('memberId', data.member.id);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redirect to member page in edit mode
        const baseUrl = location.hostname === 'localhost' 
            ? '' 
            : '/Optopia-3.0';
        window.location.href = `${baseUrl}/member.html?id=${data.member.id}&edit=true`;
    } catch (error) {
        console.error('Login error:', error);
        showError({
            he: 'שם משתמש או סיסמה שגויים',
            en: 'Invalid username or password'
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set up form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Initialize language display
    updateLanguageDisplay();
});
