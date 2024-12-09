import { getCurrentLang, setCurrentLang } from './utils.js';
import { API_BASE_URL } from './api-service.js';

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
        window.location.href = `/member.html?id=${data.member.id}&edit=true`;
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
