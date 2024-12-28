import { normalizeUsername } from './utils.js';
import { loginUser } from './api-services.js';

// Handles user login
async function login(username, password) {
    try {
        const normalizedUsername = normalizeUsername(username); // Normalize the username
        const response = await loginUser(normalizedUsername, password); // Call API

        if (response.success) {
            console.log('Login successful!');
            localStorage.setItem('authToken', response.token); // Save token in localStorage
        } else {
            console.error('Invalid username or password');
        }

        return response;
    } catch (error) {
        console.error('Login error:', error.message);
        throw error;
    }
}

// Logs out the user by clearing the auth token
async function logout() {
    try {
        localStorage.removeItem('authToken'); // Remove token from localStorage
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Checks if the user is logged in by verifying the presence of an auth token
async function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    return !!token; // Return true if token exists, otherwise false
}

// Export all login-related functions
export { login, logout, isLoggedIn };
