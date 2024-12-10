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
        console.log('Updating member:', { id, data }); // Debug log
        
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            throw new Error('No session token found');
        }

        const url = `${API_BASE_URL}/members/${id}`;
        console.log('Update URL:', url); // Debug log

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        console.log('Update response status:', response.status); // Debug log

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Update error response:', errorData); // Debug log
            throw new Error(errorData.message || `Failed to update member: ${response.status}`);
        }

        const updatedData = await response.json();
        console.log('Update successful:', updatedData); // Debug log
        return updatedData;
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
