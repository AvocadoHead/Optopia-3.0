// API base URL - use production URL in production, localhost in development
export const API_BASE_URL = location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://optopia-3-0-backend.onrender.com/api';

// Courses API
export async function getAllCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received courses data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
}

export async function getCourseById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching course:', error);
        throw error;
    }
}

export async function searchCourses(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/search/${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error searching courses:', error);
        throw error;
    }
}

// Members API
export async function getAllMembers() {
    try {
        const response = await fetch(`${API_BASE_URL}/members`);
        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
}

export async function getMemberById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/members/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching member:', error);
        throw error;
    }
}

export async function updateMember(id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/members/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating member:', error);
        throw error;
    }
}

// Gallery API
export async function getAllGalleryItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        if (!response.ok) {
            throw new Error('Failed to fetch gallery items');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        throw error;
    }
}

export async function getGalleryItemById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/gallery/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching gallery item:', error);
        throw error;
    }
}

// Authentication API
export async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('sessionToken', data.token);
        }
        return data;
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
}

export async function logout() {
    localStorage.removeItem('sessionToken');
}

// Update functions
export async function updateGalleryItem(id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/gallery/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating gallery item:', error);
        throw error;
    }
}

export async function updateCourse(id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
}

// Helper function to check if user is logged in
export function isLoggedIn() {
    return !!localStorage.getItem('sessionToken');
}
