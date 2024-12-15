import { getLangText, getCurrentLang } from './utils.js';
import { getMemberById, getAllCourses, getAllGalleryItems } from './api-service.js';

class MemberPageView {
    constructor() {
        this.currentLang = getCurrentLang();
        this.memberId = new URLSearchParams(window.location.search).get('id');
    }

    async init() {
        try {
            const [memberData, courses, galleryItems] = await Promise.all([
                getMemberById(this.memberId),
                getAllCourses(),
                getAllGalleryItems()
            ]);

            this.renderMemberDetails(memberData);
            this.renderMemberCourses(courses);
        } catch (error) {
            this.handleError(error);
        }
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

        // Filter courses where this member is a teacher
        const memberCourses = courses.filter(course => 
            course.teachers && 
            course.teachers.some(teacher => teacher.memberId === this.memberId)
        );

        if (memberCourses.length === 0) {
            const noCoursesMessage = document.createElement('p');
            noCoursesMessage.textContent = getLangText({
                he: 'אין קורסים כרגע',
                en: 'No courses at the moment'
            }, this.currentLang);
            coursesContainer.appendChild(noCoursesMessage);
            return;
        }

        memberCourses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.classList.add('course-item');
            
            // Use language-specific course name
            courseElement.textContent = this.currentLang === 'he' 
                ? course.name_he 
                : course.name_en;
            
            coursesContainer.appendChild(courseElement);
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
