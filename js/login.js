import { getCurrentLang, setCurrentLang } from './utils.js';
import { API_BASE_URL, login } from './api-service.js';

let currentLang = getCurrentLang();

// Language toggle functionality
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    updateLanguageDisplay();
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

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const { memberId } = await login(username, password);
        
        // Redirect to member page in edit mode
        window.location.href = `https://avocadohead.github.io/Optopia-3.0/member.html?id=${memberId}&edit=true`;
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
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
