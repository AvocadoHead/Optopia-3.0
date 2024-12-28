import { normalizeUsername } from './utils.js';
import { loginUser } from './api-service.js';

// Handles user login
async function login(username, password) {
    try {
        // Normalize the username
        const normalizedUsername = normalizeUsername(username);

        // Call the login API
        const response = await loginUser(normalizedUsername, password);

        // Check the response structure
        if (response && response.token) {
            console.log('Login successful!');
            localStorage.setItem('authToken', response.token); // Save token in localStorage
            return { success: true, message: 'Login successful!' };
        } else {
            console.error('Invalid username or password');
            return { success: false, message: 'Invalid username or password' };
        }
    } catch (error) {
        console.error('Login error:', error.message);
        return { success: false, message: 'Login failed. Please try again.' };
    }
}

// Logs out the user by clearing the auth token
async function logout() {
    try {
        localStorage.removeItem('authToken'); // Remove token from localStorage
        console.log('Logout successful');
        return { success: true, message: 'Logout successful' };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, message: 'Logout failed. Please try again.' };
    }
}

// Checks if the user is logged in by verifying the presence of an auth token
function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    return !!token; // Return true if token exists, otherwise false
}

// Export all login-related functions
export { login, logout, isLoggedIn };
