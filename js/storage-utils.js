import { API_BASE_URL } from './api-service.js';

// Storage buckets (for reference, actual handling is on backend)
export const STORAGE_BUCKETS = {
    PROFILE_IMAGES: 'profile-images',
    GALLERY_ITEMS: 'gallery-items'
};

export async function uploadImage(file, bucket, path) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

export async function deleteImage(path, bucket) {
    try {
        const response = await fetch(`${API_BASE_URL}/delete-image`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ path, bucket })
        });

        if (!response.ok) {
            throw new Error('Image deletion failed');
        }

        return true;
    } catch (error) {
        console.error('Deletion error:', error);
        throw error;
    }
}
