import { supabase } from './supabase-config.js';

// Helper function to log Supabase errors
function logSupabaseError(operation, error) {
    console.error(`Supabase ${operation} error:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
    });
}

// Fetch all members
export async function getMembers() {
    try {
        console.log('Fetching members from Supabase...');
        const { data, error, status } = await supabase
            .from('members')
            .select('*')
            .order('name_en');
            
        if (error) {
            logSupabaseError('members fetch', error);
            console.log('Response status:', status);
            return [];
        }
        
        if (!data) {
            console.warn('No members data received from Supabase');
            return [];
        }
        
        console.log(`Successfully fetched ${data.length} members`);
        
        // Transform data to match the old format
        return data.map(member => ({
            id: member.id,
            name: {
                he: member.name_he || '',
                en: member.name_en || ''
            },
            role: {
                he: member.role_he || '',
                en: member.role_en || ''
            },
            bio: {
                he: member.bio_he || '',
                en: member.bio_en || ''
            },
            image: member.image_url || '',
            category: member.category || ''
        }));
    } catch (error) {
        console.error('Unexpected error in getMembers:', error);
        return [];
    }
}

// Fetch all gallery items
export async function getGalleryItems() {
    try {
        console.log('Fetching gallery items from Supabase...');
        const { data, error } = await supabase
            .from('gallery_items')
            .select('*');
        
        if (error) throw error;
        
        console.log('Successfully fetched', data.length, 'gallery items');
        console.log('Raw gallery data:', data);
        
        // Transform gallery items to ensure consistent structure
        const transformedGallery = data.map(item => ({
            id: item.id,
            src: item.image_url || item.src || 'assets/default-gallery.jpg',
            title: {
                he: item.title_he || item.title || '',
                en: item.title_en || item.title || ''
            },
            description: {
                he: item.description_he || item.description || '',
                en: item.description_en || item.description || ''
            },
            artistName: {
                he: item.artist_name_he || item.artist_name || '',
                en: item.artist_name_en || item.artist_name || ''
            },
            artist: item.artist_id || null
        }));
        
        return transformedGallery;
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        return [];
    }
}

// Fetch all courses
export async function getCourses() {
    try {
        console.log('Fetching courses from Supabase...');
        const { data, error } = await supabase
            .from('courses')
            .select('*');
        
        if (error) throw error;
        
        console.log('Successfully fetched', data.length, 'courses');
        console.log('Raw courses data:', data);
        
        // Transform courses to ensure consistent structure
        const transformedCourses = data.map(course => ({
            id: course.id,
            title: {
                he: course.title_he || course.title || '',
                en: course.title_en || course.title || ''
            },
            description: {
                he: course.description_he || course.description || '',
                en: course.description_en || course.description || ''
            },
            image: course.image_url || course.image || 'assets/default-course.jpg',
            duration: course.duration || '',
            price: course.price || '',
            location: {
                he: course.location_he || course.location || '',
                en: course.location_en || course.location || ''
            },
            instructor_id: course.instructor_id || null
        }));
        
        return transformedCourses;
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
}

// Get a single member by ID
export async function getMemberById(id) {
    try {
        console.log(`Fetching member with ID ${id} from Supabase...`);
        const { data, error, status } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) {
            logSupabaseError('member by ID fetch', error);
            console.log('Response status:', status);
            return null;
        }
        
        if (!data) {
            console.warn(`No member found with ID ${id}`);
            return null;
        }
        
        console.log('Successfully fetched member:', data);
        
        // Transform data to match the old format
        return {
            id: data.id,
            name: {
                he: data.name_he || '',
                en: data.name_en || ''
            },
            role: {
                he: data.role_he || '',
                en: data.role_en || ''
            },
            bio: {
                he: data.bio_he || '',
                en: data.bio_en || ''
            },
            image: data.image_url || '',
            category: data.category || ''
        };
    } catch (error) {
        console.error('Unexpected error in getMemberById:', error);
        return null;
    }
}
