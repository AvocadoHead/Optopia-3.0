import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems 
} from './api-service.js';
import { 
    handleError, 
    getLangText, 
    getCurrentLang, 
    setCurrentLang, 
    getMemberIdFromUrl 
} from './utils.js';

let currentLang = getCurrentLang() || 'he';
let memberData = null;
let coursesData = [];
let galleryData = [];

function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = el.dataset.lang === currentLang ? '' : 'none';
    });
}

function renderMemberDetails(member) {
    if (!member) return;

    const nameElement = document.getElementById('member-name');
    const roleElement = document.getElementById('member-role');
    const bioElement = document.getElementById('member-bio');
    const imageElement = document.getElementById('member-image');

    nameElement.textContent = currentLang === 'he' ? member.name_he : member.name_en;
    roleElement.textContent = currentLang === 'he' ? member.role_he : member.role_en;
    bioElement.textContent = currentLang === 'he' ? member.bio_he : member.bio_en;
    
    imageElement.src = member.image_url || 'assets/default-profile.jpg';
    imageElement.alt = currentLang === 'he' ? member.name_he : member.name_en;
}

function renderMemberCourses(courses) {
    const coursesContainer = document.getElementById('member-courses-grid');
    coursesContainer.innerHTML = ''; // Clear existing courses

    const memberCourses = courses.filter(course => 
        course.teachers && 
        course.teachers.some(teacher => teacher.id === memberData.id)
    );

    memberCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        const title = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;

        courseCard.innerHTML = `
            <img src="${course.avatar_url || 'assets/default-course.jpg'}" 
                 alt="${title}" 
                 class="course-image">
            <div class="course-details">
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;

        courseCard.addEventListener('click', () => {
            window.location.href = `course-item.html?id=${course.id}`;
        });

        coursesContainer.appendChild(courseCard);
    });
}

function renderMemberGallery(items) {
    const galleryContainer = document.getElementById('member-gallery-grid');
    galleryContainer.innerHTML = ''; // Clear existing gallery items

    const memberGalleryItems = items.filter(item => 
        item.artist && item.artist.id === memberData.id
    );

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
            <div class="gallery-details">
                <h3>${title}</h3>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `gallery-item.html?id=${item.id}`;
        });

        galleryContainer.appendChild(card);
    });
}

async function loadMemberData() {
    try {
        const memberId = getMemberIdFromUrl();
        if (!memberId) {
            throw new Error('No member ID provided');
        }

        const [member, courses, galleryItems] = await Promise.all([
            getMemberById(memberId),
            getAllCourses(),
            getAllGalleryItems()
        ]);

        memberData = member;
        coursesData = courses;
        galleryData = galleryItems;

        renderMemberDetails(member);
        renderMemberCourses(courses);
        renderMemberGallery(galleryItems);
    } catch (error) {
        handleError(error);
    }
}

function initMemberPage() {
    updateLanguageDisplay();
    loadMemberData();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMemberPage);

// Expose functions for potential external use
window.initMemberPage = initMemberPage;
window.loadMemberData = loadMemberData;
