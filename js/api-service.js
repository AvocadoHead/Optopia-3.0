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
        const response = await fetch(`${API_BASE_URL}/courses`, { 
            headers: defaultHeaders 
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const courses = await response.json();
        return courses;
    } catch (error) {
        console.error('Error fetching courses with teachers:', error);
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

// Authentication API
export async function login(username, password) {
    try {
        // Normalize username input
        username = username.trim();

        // Handle potential name formats:
        // 1. First Last
        // 2. Last, First
        // 3. FirstLast
        // 4. first last
        // 5. FIRST LAST
        let processedUsername = username;

        // Check if username contains a comma (Last, First format)
        if (username.includes(',')) {
            // Split and reverse if comma exists
            const parts = username.split(',').map(part => part.trim());
            processedUsername = parts.length > 1 ? `${parts[1]} ${parts[0]}` : username;
        } else {
            // Handle potential multi-word names and normalize case
            const parts = username.split(/\s+/);
            processedUsername = parts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
        }

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...defaultHeaders
            },
            body: JSON.stringify({
                username: processedUsername,
                password: password
            })
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

export async function updateMember(id, data, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/members/${id}`, {
            method: 'PATCH',
            headers: {
                ...defaultHeaders,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating member:', error);
        throw error;
    }
}
