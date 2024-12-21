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
import { 
    createGalleryItem,
    deleteGalleryItem
} from './main.js';

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

// Debugging function to log all available data
function debugLogMemberData(member) {
    console.group('Member Data Debug');
    console.log('Full Member Object:', member);
    
    // Check for expected fields
    const expectedFields = [
        'id', 
        'name_he', 'name_en', 
        'role_he', 'role_en', 
        'bio_he', 'bio_en', 
        'image_url'
    ];

    expectedFields.forEach(field => {
        console.log(`${field}: ${member[field] || 'MISSING'}`);
    });

    // Additional checks
    console.log('Has courses:', member.courses ? member.courses.length : 'No courses');
    console.log('Has gallery items:', member.galleryItems ? member.galleryItems.length : 'No gallery items');
    
    console.groupEnd();
}

// Render member details
function renderMemberDetails(member) {
    log('Rendering member details', member);

    if (!member) {
        logError('No member data to render');
        return;
    }

    // Debug log
    debugLogMemberData(member);

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

        // Fallback to empty string if field is missing
        if (nameHe) nameHe.textContent = member.name_he || member.name || 'שם לא זמין';
        if (nameEn) nameEn.textContent = member.name_en || member.name || 'Name Unavailable';
        if (roleHe) roleHe.textContent = member.role_he || member.role || 'תפקיד לא זמין';
        if (roleEn) roleEn.textContent = member.role_en || member.role || 'Role Unavailable';
        if (bioHe) bioHe.textContent = member.bio_he || member.bio || 'אין ביוגרפיה זמינה';
        if (bioEn) bioEn.textContent = member.bio_en || member.bio || 'No biography available';
        
        // Set image with multiple fallbacks
        imageElement.src = member.image_url || member.imageUrl || 'assets/default-profile.jpg';
        imageElement.alt = member.name_he || member.name_en || member.name || 'Member Profile';

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
        // Get member ID from URL
        const memberId = getMemberIdFromUrl();
        log('Member ID from URL:', memberId);

        if (!memberId) {
            logError('Invalid or missing member ID');
            // Show error message to user
            const errorContainer = document.getElementById('member-details');
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <p class="error-message" data-lang="he">לא נמצא מידע על החבר</p>
                    <p class="error-message" data-lang="en" style="display:none;">No member information found</p>
                `;
            }
            return;
        }

        // Fetch member data
        const member = await getMemberById(memberId);
        log('Fetched member data:', member);

        if (!member) {
            logError('No member data retrieved');
            return;
        }

        // Store member data globally
        memberData = member;

        // Render member details
        renderMemberDetails(member);

        // Fetch and render courses and gallery items
        const [courses, galleryItems] = await Promise.all([
            getAllCourses(),
            getAllGalleryItems()
        ]);

        log('Fetched courses and gallery items', { 
            coursesCount: courses.length, 
            galleryItemsCount: galleryItems.length 
        });

        // Store global data
        coursesData = courses;
        galleryData = galleryItems;

        // Render member-specific content
        renderMemberCourses(courses);
        renderMemberGallery(galleryItems);

    } catch (error) {
        logError('Error loading member data', error);
        
        // Show error message to user
        const errorContainer = document.getElementById('member-details');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <p class="error-message" data-lang="he">אירעה שגיאה בטעינת המידע</p>
                <p class="error-message" data-lang="en" style="display:none;">An error occurred while loading data</p>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadMemberData);
