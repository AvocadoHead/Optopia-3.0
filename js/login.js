import { API_BASE_URL } from './api-service.js';
import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';

let currentLang = getCurrentLang();
document.documentElement.lang = currentLang;
document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';

// Language toggle functionality
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    
    const langToggle = document.getElementById('language-toggle');
    langToggle.textContent = currentLang === 'he' ? 'EN' : 'עב';
};

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
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('Attempting login with:', { username }); // Debug log
    
    try {
        const url = `${API_BASE_URL}/auth/login`;
        console.log('Login URL:', url); // Debug log
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'  // Important for cookie handling
        });

        console.log('Response status:', response.status); // Debug log
        const data = await response.json();
        console.log('Response data:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store the session token and member ID
        localStorage.setItem('sessionToken', data.token);
        localStorage.setItem('memberId', data.memberId);
        
        console.log('Login successful, redirecting...'); // Debug log

        // Redirect to member page in edit mode
        window.location.href = `member.html?id=${data.memberId}&edit=true`;
    } catch (error) {
        console.error('Login error:', error);
        submitButton.disabled = false;
        showError({
            he: 'שם משתמש או סיסמה שגויים',
            en: 'Invalid username or password'
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Set initial language
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
        langToggle.textContent = currentLang === 'he' ? 'EN' : 'עב';
    }
});
