import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems, 
    updateMemberCourses,
    updateMember,
    updateGalleryItem,
    createGalleryItem
} from './api-service.js';

// Authentication utility functions
function isUserLoggedIn() {
    return !!localStorage.getItem('authToken');
}

function getCurrentUserId() {
    return localStorage.getItem('userId');
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

class MemberPageEdit {
    constructor() {
        // Redirect to login if not authenticated
        if (!isUserLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        this.currentLang = getCurrentLang();
        this.memberId = getCurrentUserId();
        
        // Additional validation
        const urlMemberId = new URLSearchParams(window.location.search).get('id');
        if (!urlMemberId || urlMemberId !== this.memberId) {
            alert('Unauthorized access');
            window.location.href = 'members.html';
            return;
        }

        this.allCourses = [];
        this.memberCourses = [];
        this.memberData = null;
    }

    async init() {
        try {
            const [memberData, courses, galleryItems] = await Promise.all([
                getMemberById(this.memberId),
                getAllCourses(),
                getAllGalleryItems()
            ]);

            this.memberData = memberData;
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
        const editableFields = [
            { id: 'member-name', heField: 'name_he', enField: 'name_en' },
            { id: 'member-role', heField: 'role_he', enField: 'role_en' },
            { id: 'member-bio', heField: 'bio_he', enField: 'bio_en' }
        ];

        editableFields.forEach(field => {
            const element = document.getElementById(field.id);
            element.setAttribute('contenteditable', 'true');
            element.classList.add('editable-field');
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
            course.teachers.some(teacher => teacher.id === parseInt(this.memberId))
        );

        this.allCourses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.classList.add('course-item', 'editable');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `course-${course.id}`;
            checkbox.checked = this.memberCourses.some(mc => mc.id === course.id);
            
            const label = document.createElement('label');
            label.htmlFor = `course-${course.id}`;
            label.textContent = this.currentLang === 'he' 
                ? course.title_he 
                : course.title_en;
            
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

        const addGalleryItemBtn = document.getElementById('add-gallery-item-btn');
        addGalleryItemBtn.addEventListener('click', () => this.showAddGalleryItemModal());

        // Delegate event for delete gallery item buttons
        const galleryContainer = document.getElementById('member-gallery');
        galleryContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-btn')) {
                this.deleteGalleryItem(event.target.closest('.gallery-item'));
            }
        });
    }

    async saveChanges() {
        try {
            // Validate input
            if (!this.validateInputs()) {
                return;
            }

            // Collect selected course IDs
            const selectedCourseIds = Array.from(
                document.querySelectorAll('#member-courses input[type="checkbox"]:checked')
            ).map(checkbox => parseInt(checkbox.id.replace('course-', '')));

            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Update member's courses
            await updateMemberCourses(this.memberId, selectedCourseIds, token);

            // Update other member details (name, role, bio)
            const updatedMemberData = this.collectMemberDetails();
            await updateMember(this.memberId, updatedMemberData, token);

            alert(getLangText({
                he: 'השינויים נשמרו בהצלחה',
                en: 'Changes saved successfully'
            }, this.currentLang));
        } catch (error) {
            this.handleError(error);
        }
    }

    validateInputs() {
        const nameElement = document.getElementById('member-name');
        const roleElement = document.getElementById('member-role');
        const bioElement = document.getElementById('member-bio');

        const validateField = (element) => {
            const text = element.textContent.trim();
            if (text.length < 2) {
                element.classList.add('invalid');
                return false;
            }
            element.classList.remove('invalid');
            return true;
        };

        const isNameValid = validateField(nameElement);
        const isRoleValid = validateField(roleElement);
        const isBioValid = validateField(bioElement);

        return isNameValid && isRoleValid && isBioValid;
    }

    collectMemberDetails() {
        return {
            [`name_${this.currentLang}`]: document.getElementById('member-name').textContent.trim(),
            [`role_${this.currentLang}`]: document.getElementById('member-role').textContent.trim(),
            [`bio_${this.currentLang}`]: document.getElementById('member-bio').textContent.trim()
        };
    }

    renderMemberGallery(galleryItems) {
        const galleryContainer = document.getElementById('member-gallery');
        galleryContainer.innerHTML = ''; // Clear existing gallery

        // Add "Add New" button
        const addButton = document.createElement('button');
        addButton.id = 'add-gallery-item-btn';
        addButton.textContent = getLangText({
            he: 'הוסף פריט חדש',
            en: 'Add New Item'
        }, this.currentLang);
        addButton.classList.add('nav-btn', 'add-gallery-item');
        galleryContainer.appendChild(addButton);

        // Filter gallery items by member
        const memberGalleryItems = galleryItems.filter(item => item.artist_id === parseInt(this.memberId));

        // Render existing gallery items
        memberGalleryItems.forEach(item => {
            const itemElement = this.createGalleryItemElement(item);
            galleryContainer.appendChild(itemElement);
        });
    }

    createGalleryItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.classList.add('gallery-item', 'editable');
        itemElement.dataset.itemId = item.id;
        
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
        
        return itemElement;
    }

    showAddGalleryItemModal() {
        // Create a modal for adding a new gallery item
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${getLangText({
                    he: 'הוסף פריט גלריה חדש',
                    en: 'Add New Gallery Item'
                }, this.currentLang)}</h2>
                <input type="file" id="gallery-item-upload" accept="image/*">
                <input type="text" id="gallery-item-title-he" placeholder="כותרת בעברית">
                <input type="text" id="gallery-item-title-en" placeholder="Title in English">
                <button id="upload-gallery-item-btn">${getLangText({
                    he: 'העלה',
                    en: 'Upload'
                }, this.currentLang)}</button>
                <button id="cancel-upload-btn">${getLangText({
                    he: 'בטל',
                    en: 'Cancel'
                }, this.currentLang)}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners for modal
        const uploadBtn = modal.querySelector('#upload-gallery-item-btn');
        const cancelBtn = modal.querySelector('#cancel-upload-btn');
        const fileInput = modal.querySelector('#gallery-item-upload');

        uploadBtn.addEventListener('click', () => this.uploadGalleryItem(modal));
        cancelBtn.addEventListener('click', () => document.body.removeChild(modal));
    }

    async uploadGalleryItem(modal) {
        try {
            const fileInput = modal.querySelector('#gallery-item-upload');
            const titleHeInput = modal.querySelector('#gallery-item-title-he');
            const titleEnInput = modal.querySelector('#gallery-item-title-en');

            if (!fileInput.files.length) {
                alert(getLangText({
                    he: 'אנא בחר תמונה להעלאה',
                    en: 'Please select an image to upload'
                }, this.currentLang));
                return;
            }

            const file = fileInput.files[0];
            const token = getAuthToken();

            // Create form data for upload
            const formData = new FormData();
            formData.append('image', file);
            formData.append('title_he', titleHeInput.value || '');
            formData.append('title_en', titleEnInput.value || '');
            formData.append('artist_id', this.memberId);

            // Upload gallery item
            const newItem = await createGalleryItem(formData, token);

            // Add new item to gallery
            const galleryContainer = document.getElementById('member-gallery');
            const newItemElement = this.createGalleryItemElement(newItem);
            galleryContainer.appendChild(newItemElement);

            // Remove modal
            document.body.removeChild(modal);

            alert(getLangText({
                he: 'פריט גלריה נוסף בהצלחה',
                en: 'Gallery item added successfully'
            }, this.currentLang));
        } catch (error) {
            this.handleError(error);
        }
    }

    async deleteGalleryItem(itemElement) {
        try {
            const itemId = itemElement.dataset.itemId;
            const token = getAuthToken();

            // Confirm deletion
            const confirmDelete = confirm(getLangText({
                he: 'האם אתה בטוח שברצונך למחוק פריט זה?',
                en: 'Are you sure you want to delete this item?'
            }, this.currentLang));

            if (!confirmDelete) return;

            // Delete from backend
            await updateGalleryItem(itemId, { deleted: true }, token);

            // Remove from DOM
            itemElement.remove();

            alert(getLangText({
                he: 'פריט הגלריה נמחק בהצלחה',
                en: 'Gallery item deleted successfully'
            }, this.currentLang));
        } catch (error) {
            this.handleError(error);
        }
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
