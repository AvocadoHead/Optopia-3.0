import { getLangText, getCurrentLang } from './utils.js';
import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems, 
    updateMemberCourses 
} from './api-service.js';
import { getCurrentUserId } from './auth.js';

class MemberPageEdit {
    constructor() {
        this.currentLang = getCurrentLang();
        this.memberId = getCurrentUserId();
        this.allCourses = [];
        this.memberCourses = [];
    }

    async init() {
        try {
            const [memberData, courses, galleryItems] = await Promise.all([
                getMemberById(this.memberId),
                getAllCourses(),
                getAllGalleryItems()
            ]);

            this.allCourses = courses;
            this.renderMemberDetails(memberData);
            this.renderAllCourses();
            this.renderMemberGallery(galleryItems);
            this.setupEventListeners();
        } catch (error) {
            this.handleError(error);
        }
    }

    renderMemberDetails(memberData) {
        // Editable fields with contenteditable
        const editableFields = [
            { id: 'member-name', heField: 'name_he', enField: 'name_en' },
            { id: 'member-role', heField: 'role_he', enField: 'role_en' },
            { id: 'member-bio', heField: 'bio_he', enField: 'bio_en' }
        ];

        editableFields.forEach(field => {
            const element = document.getElementById(field.id);
            element.setAttribute('contenteditable', 'true');
            element.textContent = this.currentLang === 'he' 
                ? memberData[field.heField] 
                : memberData[field.enField];
        });
    }

    renderAllCourses() {
        const coursesContainer = document.getElementById('member-courses');
        coursesContainer.innerHTML = ''; // Clear existing courses

        // Determine current member's courses
        this.memberCourses = this.allCourses.filter(course => 
            course.teachers && 
            course.teachers.some(teacher => teacher.memberId === this.memberId)
        );

        this.allCourses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.classList.add('course-item', 'editable');
            
            // Course checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `course-${course.id}`;
            checkbox.checked = this.memberCourses.some(mc => mc.id === course.id);
            
            // Course name label
            const label = document.createElement('label');
            label.htmlFor = `course-${course.id}`;
            label.textContent = this.currentLang === 'he' 
                ? course.name_he 
                : course.name_en;
            
            // Course avatar
            const avatar = document.createElement('img');
            avatar.src = course.avatar_url || 'path/to/default/course-avatar.jpg';
            avatar.alt = `${label.textContent} Avatar`;
            avatar.classList.add('course-avatar');
            
            courseElement.appendChild(checkbox);
            courseElement.appendChild(label);
            courseElement.appendChild(avatar);
            
            coursesContainer.appendChild(courseElement);
        });
    }

    setupEventListeners() {
        const saveButton = document.getElementById('save-changes-btn');
        saveButton.addEventListener('click', () => this.saveChanges());
    }

    async saveChanges() {
        try {
            // Collect selected course IDs
            const selectedCourseIds = Array.from(
                document.querySelectorAll('#member-courses input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.id.replace('course-', ''));

            // Update member's courses
            await updateMemberCourses(this.memberId, selectedCourseIds);

            // Update other member details (name, role, bio)
            const updatedMemberData = this.collectMemberDetails();
            await updateMember(updatedMemberData);

            alert(getLangText({
                he: 'השינויים נשמרו בהצלחה',
                en: 'Changes saved successfully'
            }, this.currentLang));
        } catch (error) {
            this.handleError(error);
        }
    }

    collectMemberDetails() {
        return {
            id: this.memberId,
            [`name_${this.currentLang}`]: document.getElementById('member-name').textContent,
            [`role_${this.currentLang}`]: document.getElementById('member-role').textContent,
            [`bio_${this.currentLang}`]: document.getElementById('member-bio').textContent
        };
    }

    renderMemberGallery(galleryItems) {
        const galleryContainer = document.getElementById('member-gallery');
        galleryContainer.innerHTML = ''; // Clear existing gallery

        // Filter gallery items by member
        const memberGalleryItems = galleryItems.filter(item => item.artist_id === this.memberId);

        // Add "Add New" button
        const addButton = document.createElement('button');
        addButton.textContent = getLangText({
            he: 'הוסף פריט חדש',
            en: 'Add New Item'
        }, this.currentLang);
        addButton.classList.add('nav-btn', 'add-gallery-item');
        galleryContainer.appendChild(addButton);

        // Render existing gallery items
        memberGalleryItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('gallery-item', 'editable');
            
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = this.currentLang === 'he' ? item.title_he : item.title_en;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = getLangText({
                he: 'מחק',
                en: 'Delete'
            }, this.currentLang);
            deleteBtn.classList.add('delete-btn');
            
            itemElement.appendChild(img);
            itemElement.appendChild(deleteBtn);
            galleryContainer.appendChild(itemElement);
        });
    }

    handleError(error) {
        console.error('Error in member page edit:', error);
        alert(getLangText({
            he: 'אירעה שגיאה. אנא נסה שוב',
            en: 'An error occurred. Please try again.'
        }, this.currentLang));
    }
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', () => {
    const memberPageEdit = new MemberPageEdit();
    memberPageEdit.init();
});
