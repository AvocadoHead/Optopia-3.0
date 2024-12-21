// API base URL - use production URL in production, localhost in development
export const API_BASE_URL = location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://optopia-3-0-backend.onrender.com/api';

// Default headers for API calls
const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// Helper function to set auth token for API calls
function setAuthToken(token) {
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
        delete defaultHeaders['Authorization'];
    }
}

// Authentication API
export async function login(identifier, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify({ identifier, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Login Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        
        // Store the token in localStorage
        if (data.token) {
            localStorage.setItem('authToken', data.token);
        }

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function logout() {
    try {
        // Remove the token from localStorage
        localStorage.removeItem('authToken');
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

export async function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    return !!token;
}

// Update functions
export async function updateCourse(id, data) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
            method: 'PATCH',
            headers: {
                ...defaultHeaders,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Update Course Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
}
