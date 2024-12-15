import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems 
} from './api-service.js';
import { 
    handleError, 
    getCurrentLang, 
    getMemberIdFromUrl 
} from './utils.js';

// Logging utility
function log(message, data = null) {
    console.log(`[MemberPageView] ${message}`, data || '');
}

// Error logging utility
function logError(message, error = null) {
    console.error(`[MemberPageView] ${message}`, error || '');
}

// Current language setting
const currentLang = getCurrentLang() || 'he';

// Global state
let memberData = null;
let coursesData = [];
let galleryData = [];

// Render member details
function renderMemberDetails(member) {
    log('Rendering member details', member);

    if (!member) {
        logError('No member data to render');
        return;
    }

    try {
        // Basic details elements
        const nameElement = document.getElementById('member-name');
        const roleElement = document.getElementById('member-role');
        const bioElement = document.getElementById('member-bio');
        const imageElement = document.getElementById('member-image');

        // Validate elements exist
        if (!nameElement || !roleElement || !bioElement || !imageElement) {
            logError('Missing DOM elements for member details', {
                nameElement: !!nameElement,
                roleElement: !!roleElement,
                bioElement: !!bioElement,
                imageElement: !!imageElement
            });
            return;
        }

        // Populate details with language-specific content
        nameElement.textContent = currentLang === 'he' ? member.name_he : member.name_en;
        roleElement.textContent = currentLang === 'he' ? member.role_he : member.role_en;
        bioElement.textContent = currentLang === 'he' ? member.bio_he : member.bio_en;
        
        // Set image with fallback
        imageElement.src = member.image_url || 'assets/default-profile.jpg';
        imageElement.alt = currentLang === 'he' ? member.name_he : member.name_en;

        log('Member details rendered successfully');
    } catch (error) {
        logError('Error rendering member details', error);
    }
}

// Render member courses
function renderMemberCourses(courses) {
    log('Rendering member courses', { coursesCount: courses.length });

    const coursesContainer = document.getElementById('member-courses-grid');
    if (!coursesContainer) {
        logError('Courses container not found');
        return;
    }

    coursesContainer.innerHTML = ''; // Clear existing courses

    // Filter courses where member is a teacher
    const memberCourses = courses.filter(course => 
        course.teachers && 
        course.teachers.some(teacher => teacher.id === memberData.id)
    );

    log('Filtered member courses', { memberCoursesCount: memberCourses.length });

    memberCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        const title = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;

        courseCard.innerHTML = `
            <div class="course-card-content">
                <h3 class="course-title">${title}</h3>
                <p class="course-description">${description}</p>
            </div>
        `;
        
        coursesContainer.appendChild(courseCard);
    });

    log('Member courses rendering complete');
}

// Render member gallery
function renderMemberGallery(items) {
    log('Rendering member gallery', { itemsCount: items.length });

    const galleryContainer = document.getElementById('member-gallery-grid');
    if (!galleryContainer) {
        logError('Gallery container not found');
        return;
    }

    galleryContainer.innerHTML = ''; // Clear existing gallery items

    const memberGalleryItems = items.filter(item => 
        item.artist && item.artist.id === memberData.id
    );

    log('Filtered member gallery items', { memberGalleryItemsCount: memberGalleryItems.length });

    memberGalleryItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;

        card.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'assets/default-gallery.jpg'}" 
                     alt="${title}" 
                     onerror="this.src='assets/default-gallery.jpg'">
            </div>
            <div class="gallery-card-content">
                <h3 class="gallery-title">${title}</h3>
            </div>
        `;
        
        galleryContainer.appendChild(card);
    });

    log('Member gallery rendering complete');
}

// Main data loading function
async function loadMemberData() {
    try {
        log('Starting loadMemberData');
        
        // Get member ID from URL
        const memberId = getMemberIdFromUrl();
        log('Member ID from URL', memberId);
        
        if (!memberId) {
            logError('No member ID provided');
            throw new Error('No member ID provided');
        }

        log('Fetching member data...');
        const [member, courses, galleryItems] = await Promise.all([
            getMemberById(memberId),
            getAllCourses(),
            getAllGalleryItems()
        ]);

        log('Fetched data', { 
            member, 
            coursesCount: courses.length, 
            galleryItemsCount: galleryItems.length 
        });

        if (!member) {
            logError('No member data found');
            return;
        }

        // Store fetched data
        memberData = member;
        coursesData = courses;
        galleryData = galleryItems;

        // Render all sections
        renderMemberDetails(member);
        renderMemberCourses(courses);
        renderMemberGallery(galleryItems);
    } catch (error) {
        logError('Complete loadMemberData error', error);
        handleError(error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadMemberData);
