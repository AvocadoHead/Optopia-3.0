// Utility functions for the Optopia website

// Error handling utilities
export function handleError(error, defaultMessage = '') {
    console.error('Error:', error);
    return {
        message: error.message || defaultMessage,
        error: error
    };
}

// Show error notification
export function showErrorNotification(message, lang = 'he') {
    const defaultMessages = {
        he: 'אירעה שגיאה. אנא נסה שוב מאוחר יותר.',
        en: 'An error occurred. Please try again later.'
    };
    
    const errorMessage = message || defaultMessages[lang];
    console.error(errorMessage);
    // You can implement a more sophisticated error notification system here
    return errorMessage;
}

// Username normalization utility
export function normalizeUsername(username) {
    if (!username) return '';
    const normalized = username.replace(/-/g, '').toLowerCase(); // Remove existing hyphens and lowercase
    return normalized
        .split('') // Add hyphens back in the correct format
        .reduce((acc, char, idx) => {
            if ([3, 7].includes(idx)) acc += '-'; // Example format: xxx-xxxx-xxxx
            return acc + char;
        }, '');
}

// Date formatting utility
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Time formatting utility
export function formatTime(timeString) {
    if (!timeString) return '';
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get current language
export function getCurrentLang() {
    // Check localStorage first
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
        return storedLang;
    }
    
    // Default to Hebrew if no language is set
    return 'he';
}

// Set current language
export function setCurrentLang(lang) {
    localStorage.setItem('language', lang);
}

// Multilingual text retrieval
export function getLangText(textObj, lang = 'he') {
    if (!textObj) return '';
    return textObj[lang] || textObj['en'] || textObj['he'] || '';
}

// Get member ID from URL
export function getMemberIdFromUrl() {
    // Get the current URL
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    
    console.log('URL Parameters:', {
        fullURL: window.location.href,
        searchParams: window.location.search,
        memberId: memberId
    });

    // Validate memberId
    if (!memberId) {
        console.error('No member ID found in URL');
        return null;
    }

    return memberId;
}
