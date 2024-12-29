const API_BASE_URL = location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://optopia-3-0-backend.onrender.com/api';

/**
 * Helper function to make API requests.
 * @param {string} endpoint - The API endpoint.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE).
 * @param {Object} [data] - Request body data.
 * @param {Object} [headers] - Additional headers.
 * @returns {Promise<Object>} - Response JSON.
 */
async function apiRequest(endpoint, method = 'GET', data = null, headers = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
    };

    const config = {
        method,
        headers: defaultHeaders,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Log in a user.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - Response containing the token and user data.
 */
async function loginUser(username, password) {
    return apiRequest('/auth/login', 'POST', { username, password });
}

/**
 * Log out a user.
 */
function logoutUser() {
    localStorage.removeItem('authToken'); // Clear the token from local storage
}

/**
 * Fetch user data by ID.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} - User data.
 */
async function getUserById(userId) {
    return apiRequest(`/users/${userId}`);
}

/**
 * Fetch all courses.
 * @returns {Promise<Array>} - List of all courses.
 */
async function getAllCourses() {
    return apiRequest('/courses', 'GET');
}

/**
 * Fetch all gallery items.
 * @returns {Promise<Array>} - List of all gallery items.
 */
async function getAllGalleryItems() {
    return apiRequest('/gallery', 'GET');
}

/**
 * Fetch all members.
 * @returns {Promise<Array>} - List of all members.
 */
async function getAllMembers() {
    return apiRequest('/members', 'GET');
}

/**
 * Fetch member data by ID.
 * @param {string} memberId - The ID of the member.
 * @returns {Promise<Object>} - Member data.
 */
async function getMemberById(memberId) {
    return apiRequest(`/members/${memberId}`);
}

export { 
    loginUser, 
    logoutUser, 
    getUserById, 
    getAllCourses, 
    getAllGalleryItems, 
    getAllMembers, 
    getMemberById 
};
