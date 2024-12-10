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

// Courses API
export async function getAllCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`, { headers: defaultHeaders });
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
        const response = await fetch(`${API_BASE_URL}/courses/${id}`, { headers: defaultHeaders });
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
        const response = await fetch(`${API_BASE_URL}/courses/search/${encodeURIComponent(query)}`, { headers: defaultHeaders });
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
        const response = await fetch(`${API_BASE_URL}/members`, { headers: defaultHeaders });
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
        const response = await fetch(`${API_BASE_URL}/members/${id}`, { headers: defaultHeaders });
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
            headers: defaultHeaders,
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
        const response = await fetch(`${API_BASE_URL}/gallery`, { headers: defaultHeaders });
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
        const response = await fetch(`${API_BASE_URL}/gallery/${id}`, { headers: defaultHeaders });
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
export async function login(identifier, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify({ 
                identifier: identifier.trim(),  // can be email, username, or member name
                password: password              // backend will check both password fields
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Authentication failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        // The backend should return either user.id or member.id as token
        const token = data.token || data.id;
        const memberId = data.memberId || data.member_id || data.id;

        if (!token || !memberId) {
            console.error('Server response:', data);
            throw new Error('Invalid server response: missing token or memberId');
        }

        // Store auth data
        localStorage.setItem('sessionToken', token);
        localStorage.setItem('memberId', memberId);

        // Set the token for future API calls
        setAuthToken(token);

        return { token, memberId };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function logout() {
    try {
        // Call logout endpoint if it exists
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: defaultHeaders,
            credentials: 'include'
        }).catch(() => {}); // Ignore errors on logout request
    } finally {
        // Clear local storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('memberId');
        // Remove auth header
        setAuthToken(null);
    }
}

// Check if user is logged in
export function isLoggedIn() {
    const token = localStorage.getItem('sessionToken');
    const memberId = localStorage.getItem('memberId');
    return !!(token && memberId);
}

// Update functions
export async function updateGalleryItem(id, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/gallery/${id}`, {
            method: 'PUT',
            headers: defaultHeaders,
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
            headers: defaultHeaders,
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
