import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems 
} from './api-service.js';

// Authentication utility functions
function isUserLoggedIn() {
    return !!localStorage.getItem('authToken');
}

function getCurrentUserId() {
    return localStorage.getItem('userId');
}

class MemberPageView {
    constructor() {
        // Redirect to login if not authenticated
        if (!isUserLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        this.currentLang = getCurrentLang();
        this.memberId = new URLSearchParams(window.location.search).get('id');
        
        // Additional validation
        if (!this.memberId) {
            alert('Invalid member ID');
            window.location.href = 'members.html';
            return;
        }
    }

    async init() {
        try {
            const [memberData, courses, galleryItems] = await Promise.all([
                this.fetchMemberDetails(),
                this.fetchMemberCourses(),
                this.fetchMemberGalleryItems()
            ]);

            this.renderMemberDetails(memberData);
            this.renderMemberCourses(courses);
            this.renderMemberGallery(galleryItems);
        } catch (error) {
            this.handleError(error);
        }
    }

    async fetchMemberDetails() {
        return await getMemberById(this.memberId);
    }

    async fetchMemberCourses() {
        const allCourses = await getAllCourses();
        // Filter courses where this member is a teacher
        return allCourses.filter(course => 
            course.teachers && 
            course.teachers.some(teacher => teacher.id === parseInt(this.memberId))
        );
    }

    async fetchMemberGalleryItems() {
        const allGalleryItems = await getAllGalleryItems();
        // Filter gallery items by this member
        return allGalleryItems.filter(item => item.artist_id === parseInt(this.memberId));
    }

    renderMemberDetails(memberData) {
        // Populate name
        const nameElement = document.getElementById('member-name');
        nameElement.textContent = this.currentLang === 'he' 
            ? memberData.name_he 
            : memberData.name_en;
        
        // Populate role
        const roleElement = document.getElementById('member-role');
        roleElement.textContent = this.currentLang === 'he' 
            ? memberData.role_he 
            : memberData.role_en;
        
        // Populate bio
        const bioElement = document.getElementById('member-bio');
        bioElement.textContent = this.currentLang === 'he' 
            ? memberData.bio_he 
            : memberData.bio_en;
    }

    renderMemberCourses(courses) {
        const coursesContainer = document.getElementById('member-courses');
        coursesContainer.innerHTML = ''; // Clear existing courses

        if (courses.length === 0) {
            const noCoursesMessage = document.createElement('p');
            noCoursesMessage.textContent = getLangText({
                he: 'אין קורסים כרגע',
                en: 'No courses at the moment'
            }, this.currentLang);
            coursesContainer.appendChild(noCoursesMessage);
            return;
        }

        courses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.classList.add('course-item');
            
            // Use language-specific course name
            courseElement.textContent = this.currentLang === 'he' 
                ? course.title_he 
                : course.title_en;
            
            coursesContainer.appendChild(courseElement);
        });
    }

    renderMemberGallery(galleryItems) {
        const galleryContainer = document.getElementById('member-gallery');
        galleryContainer.innerHTML = ''; // Clear existing gallery

        if (galleryItems.length === 0) {
            const noGalleryMessage = document.createElement('p');
            noGalleryMessage.textContent = getLangText({
                he: 'אין פריטים בגלריה כרגע',
                en: 'No gallery items at the moment'
            }, this.currentLang);
            galleryContainer.appendChild(noGalleryMessage);
            return;
        }

        galleryItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('gallery-item');
            
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = this.currentLang === 'he' 
                ? (item.title_he || 'תמונה') 
                : (item.title_en || 'Image');
            
            itemElement.appendChild(img);
            galleryContainer.appendChild(itemElement);
        });
    }

    handleError(error) {
        console.error('Error loading member data:', error);
        const errorContainer = document.createElement('div');
        errorContainer.classList.add('error-message');
        errorContainer.textContent = getLangText({
            he: 'אירעה שגיאה בטעינת הנתונים',
            en: 'An error occurred while loading data'
        }, this.currentLang);
        
        document.querySelector('main').appendChild(errorContainer);
    }
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', () => {
    const memberPageView = new MemberPageView();
    memberPageView.init();
});
