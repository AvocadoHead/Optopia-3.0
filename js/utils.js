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
