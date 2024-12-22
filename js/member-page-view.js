import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems,
    getAllMembers
} from './api-service.js';
import { 
    handleError, 
    getCurrentLang, 
    getMemberIdFromUrl 
} from './utils.js';

// Global state variables
let galleryData = [];
let coursesData = [];
let membersData = [];

// Data initialization function
async function initializeAppData() {
    try {
        // Fetch all data in parallel
        const [galleryItems, courses, members] = await Promise.all([
            getAllGalleryItems(),
            getAllCourses(),
            getAllMembers()
        ]);
        
        // Store the data
        galleryData = galleryItems || [];
        coursesData = courses || [];
        membersData = members || [];
        
        return { galleryData, coursesData, membersData };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Logging utility
function log(message, data = null) {
    console.log(`[MemberPageView] ${message}`, data || '');
}

// Error logging utility
function logError(message, error = null) {
    console.error(`[MemberPageView] ${message}`, error || '');
}

// Error display function
function displayErrorMessage(message) {
    const errorContainer = document.createElement('div');
    errorContainer.classList.add('error-message');
    errorContainer.innerHTML = `
        <h2>Oops! Something went wrong</h2>
        <p>${message}</p>
        <button onclick="window.location.reload()">Try Again</button>
    `;
    
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.appendChild(errorContainer);
    }
}

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

        // Update image
        imageElement.src = member.image_url || 'assets/default-member.jpg';
        imageElement.alt = member.name_he || member.name_en || 'Member Image';

        // Populate details with language-specific content
        const nameHe = nameElement.querySelector('[data-lang="he"]');
        const nameEn = nameElement.querySelector('[data-lang="en"]');
        const roleHe = roleElement.querySelector('[data-lang="he"]');
        const roleEn = roleElement.querySelector('[data-lang="en"]');
        const bioHe = bioElement.querySelector('[data-lang="he"]');
        const bioEn = bioElement.querySelector('[data-lang="en"]');

        // Update text content
        if (nameHe) nameHe.textContent = member.name_he || '';
        if (nameEn) nameEn.textContent = member.name_en || '';
        if (roleHe) roleHe.textContent = member.role_he || '';
        if (roleEn) roleEn.textContent = member.role_en || '';
        if (bioHe) bioHe.textContent = member.bio_he || '';
        if (bioEn) bioEn.textContent = member.bio_en || '';
    } catch (error) {
        logError('Error rendering member details', error);
    }
}

// Render member courses
function renderMemberCourses(courses) {
    const coursesContainer = document.getElementById('member-courses');
    if (!coursesContainer) {
        logError('Courses container not found');
        return;
    }

    // Clear previous courses
    coursesContainer.innerHTML = '';

    // Check if there are courses
    if (!courses || courses.length === 0) {
        const noCourseMessage = document.createElement('p');
        noCourseMessage.textContent = 'No courses found';
        coursesContainer.appendChild(noCourseMessage);
        return;
    }

    // Render each course
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.onclick = () => window.location.href = `course-item.html?id=${course.id}`;
        
        // Use current language to display title and description
        const currentLang = getCurrentLang() || 'he';
        const title = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;
        
        courseCard.innerHTML = `
            <h3>${title || 'Untitled Course'}</h3>
            <p>${description || 'No description available'}</p>
        `;
        
        coursesContainer.appendChild(courseCard);
    });
}

// Render member gallery
function renderMemberGallery(items) {
    const galleryContainer = document.getElementById('member-gallery');
    if (!galleryContainer) {
        logError('Gallery container not found');
        return;
    }

    // Clear previous gallery items
    galleryContainer.innerHTML = '';

    // Check if there are gallery items
    if (!items || items.length === 0) {
        const noItemMessage = document.createElement('p');
        noItemMessage.textContent = 'No gallery items found';
        galleryContainer.appendChild(noItemMessage);
        return;
    }

    // Render each gallery item
    items.forEach(item => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        // Use current language to display title and description
        const currentLang = getCurrentLang() || 'he';
        const title = currentLang === 'he' ? item.title_he : item.title_en;
        const description = currentLang === 'he' ? item.description_he : item.description_en;
        
        galleryItem.innerHTML = `
            <img src="${item.imageUrl || 'assets/placeholder.jpg'}" 
                 alt="${title || 'Gallery Item'}"
                 onerror="this.src='assets/placeholder.jpg'">
            <div class="overlay">
                <h3>${title || 'Untitled'}</h3>
                <p>${description || 'No description'}</p>
            </div>
        `;
        
        galleryItem.addEventListener('click', () => {
            window.location.href = `gallery-item.html?id=${item.id}`;
        });
        
        galleryContainer.appendChild(galleryItem);
    });
}

// Main data loading function
async function loadMemberData() {
    try {
        // Get member ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('id');
        
        if (!memberId) {
            logError('No member ID found in URL');
            displayErrorMessage('No member ID found');
            return;
        }

        // Find member in pre-loaded data
        const member = membersData.find(m => m.id === memberId);
        
        if (!member) {
            logError('Member not found in data');
            displayErrorMessage('Member not found');
            return;
        }

        // Render member details
        renderMemberDetails(member);

        // Render member's gallery items
        const memberGalleryItems = galleryData.filter(item => item.artist === memberId);
        renderMemberGallery(memberGalleryItems);

        // Render member's courses
        const memberCourses = coursesData.filter(course => 
            course.teachers && course.teachers.some(teacher => teacher.id === memberId)
        );
        renderMemberCourses(memberCourses);

    } catch (error) {
        logError('Error in loadMemberData', error);
        displayErrorMessage('An error occurred while loading member data');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ensure app data is initialized
        await initializeAppData();
        
        // Then load member data
        loadMemberData();
    } catch (error) {
        logError('Error initializing page', error);
        displayErrorMessage('Failed to initialize page');
    }
});

// Expose functions for potential external use
export {
    initializeAppData,
    loadMemberData
};
