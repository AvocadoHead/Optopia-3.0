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

// Ensure global logging for debugging
window.memberPageViewLog = log;
window.memberPageViewLogError = logError;

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
        const nameHe = nameElement.querySelector('[data-lang="he"]');
        const nameEn = nameElement.querySelector('[data-lang="en"]');
        const roleHe = roleElement.querySelector('[data-lang="he"]');
        const roleEn = roleElement.querySelector('[data-lang="en"]');
        const bioHe = bioElement.querySelector('[data-lang="he"]');
        const bioEn = bioElement.querySelector('[data-lang="en"]');

        if (nameHe) nameHe.textContent = member.name_he || '';
        if (nameEn) nameEn.textContent = member.name_en || '';
        if (roleHe) roleHe.textContent = member.role_he || '';
        if (roleEn) roleEn.textContent = member.role_en || '';
        if (bioHe) bioHe.textContent = member.bio_he || '';
        if (bioEn) bioEn.textContent = member.bio_en || '';
        
        // Set image with fallback
        imageElement.src = member.image_url || 'assets/default-profile.jpg';
        imageElement.alt = member.name_he || member.name_en || 'Member Profile';

        // Prepare data attributes for potential edit mode
        [nameElement, roleElement, bioElement].forEach(el => {
            el.setAttribute('data-field', el.id.replace('member-', ''));
        });

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

    if (memberCourses.length === 0) {
        const noCoursesMessage = document.createElement('p');
        noCoursesMessage.textContent = currentLang === 'he' ? 'אין קורסים זמינים' : 'No courses available';
        coursesContainer.appendChild(noCoursesMessage);
        return;
    }

    memberCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        const title = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;

        courseCard.innerHTML = `
            <div class="course-card-content">
                <h3 class="course-title">${title || 'Untitled Course'}</h3>
                <p class="course-description">${description || ''}</p>
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

    if (memberGalleryItems.length === 0) {
        const noGalleryMessage = document.createElement('p');
        noGalleryMessage.textContent = currentLang === 'he' ? 'אין פריטי גלריה זמינים' : 'No gallery items available';
        galleryContainer.appendChild(noGalleryMessage);
        return;
    }

    memberGalleryItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;

        card.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'assets/default-gallery.jpg'}" 
                     alt="${title || 'Untitled Gallery Item'}" 
                     onerror="this.src='assets/default-gallery.jpg'">
            </div>
            <div class="gallery-card-content">
                <h3 class="gallery-title">${title || 'Untitled'}</h3>
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
        
        // Log localStorage contents for debugging
        console.log('LocalStorage Contents:', {
            sessionToken: localStorage.getItem('sessionToken'),
            memberId: localStorage.getItem('memberId')
        });

        // Get member ID from URL
        const memberId = getMemberIdFromUrl();
        log('Member ID from URL:', memberId);

        if (!memberId) {
            logError('Invalid or missing member ID');
            // Optionally redirect or show an error message
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            errorContainer.textContent = currentLang === 'he' 
                ? 'לא נמצא מזהה חבר תקף' 
                : 'Invalid member ID';
            
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.innerHTML = '';
                mainContent.appendChild(errorContainer);
            }
            return;
        }

        // Fetch member details
        const member = await getMemberById(memberId);
        log('Fetched member details:', member);

        if (!member) {
            logError('No member data found for ID:', memberId);
            // Create and display error message
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            errorContainer.textContent = currentLang === 'he' 
                ? 'לא נמצאו פרטי חבר' 
                : 'Member details not found';
            
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.innerHTML = '';
                mainContent.appendChild(errorContainer);
            }
            return;
        }

        // Store member data globally
        memberData = member;

        // Render member details
        renderMemberDetails(member);

        // Fetch all courses
        const courses = await getAllCourses();
        log('Fetched all courses:', courses);

        // Render member courses
        renderMemberCourses(courses);

        // Fetch all gallery items
        const galleryItems = await getAllGalleryItems();
        log('Fetched all gallery items:', galleryItems);

        // Render member gallery
        renderMemberGallery(galleryItems);

    } catch (error) {
        logError('Comprehensive error in loadMemberData:', error);
        
        // Create and display comprehensive error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <h2>${currentLang === 'he' ? 'שגיאה' : 'Error'}</h2>
            <p>${currentLang === 'he' 
                ? 'אירעה שגיאה בטעינת נתוני החבר' 
                : 'An error occurred while loading member data'}</p>
            <pre>${error.message}</pre>
        `;
        
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = '';
            mainContent.appendChild(errorContainer);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadMemberData);
