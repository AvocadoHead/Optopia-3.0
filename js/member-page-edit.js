import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems,
    updateMember,
    updateMemberCourses
} from './api-service.js';
import { 
    createGalleryItem,
    deleteGalleryItem
} from './main.js';
import { 
    handleError, 
    getLangText, 
    getCurrentLang, 
    getMemberIdFromUrl 
} from './utils.js';
import { uploadImage, deleteImage, STORAGE_BUCKETS } from './storage-utils.js';

let currentLang = getCurrentLang() || 'he';
let memberData = null;
let coursesData = [];
let galleryData = [];

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

    // Add edit functionality
    [nameElement, roleElement, bioElement].forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.classList.add('editable-field');
    });
}

function renderMemberCourses(courses) {
    const coursesContainer = document.getElementById('member-courses');
    coursesContainer.innerHTML = ''; // Clear existing courses

    courses.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.classList.add('course-item', 'editable');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `course-${course.id}`;
        checkbox.checked = course.teachers && 
            course.teachers.some(teacher => teacher.id === memberData.id);
        
        const label = document.createElement('label');
        label.htmlFor = `course-${course.id}`;
        label.textContent = currentLang === 'he' ? course.title_he : course.title_en;
        
        const avatar = document.createElement('img');
        avatar.src = course.avatar_url || 'assets/default-course.jpg';
        avatar.alt = label.textContent;
        avatar.classList.add('course-avatar');
        
        courseElement.appendChild(checkbox);
        courseElement.appendChild(label);
        courseElement.appendChild(avatar);
        
        coursesContainer.appendChild(courseElement);
    });
}

function renderMemberGallery(items) {
    const galleryContainer = document.getElementById('member-gallery');
    galleryContainer.innerHTML = ''; // Clear existing gallery items

    const memberGalleryItems = items.filter(item => 
        item.artist && item.artist.id === memberData.id
    );

    memberGalleryItems.forEach(item => {
        const galleryItem = document.createElement('div');
        galleryItem.classList.add('gallery-item');
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;

        galleryItem.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'assets/default-gallery.jpg'}" 
                     alt="${title}" 
                     onerror="this.src='assets/default-gallery.jpg'">
            </div>
            <div class="gallery-details">
                <h3>${title}</h3>
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
        `;

        galleryContainer.appendChild(galleryItem);
    });

    // Add gallery item upload button
    const uploadButton = document.createElement('button');
    uploadButton.id = 'add-gallery-item-btn';
    uploadButton.textContent = getLangText({
        he: 'הוסף פריט לגלריה',
        en: 'Add Gallery Item'
    }, currentLang);
    uploadButton.addEventListener('click', showAddGalleryItemModal);
    
    galleryContainer.appendChild(uploadButton);
}

function showAddGalleryItemModal() {
    const modal = document.getElementById('add-gallery-modal');
    if (modal) modal.style.display = 'block';
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

async function saveChanges() {
    try {
        const selectedCourseIds = Array.from(
            document.querySelectorAll('#member-courses input[type="checkbox"]:checked')
        ).map(checkbox => parseInt(checkbox.id.replace('course-', '')));

        const updatedMemberData = {
            [`name_${currentLang}`]: document.getElementById('member-name').textContent.trim(),
            [`role_${currentLang}`]: document.getElementById('member-role').textContent.trim(),
            [`bio_${currentLang}`]: document.getElementById('member-bio').textContent.trim()
        };

        await Promise.all([
            updateMemberCourses(memberData.id, selectedCourseIds),
            updateMember(memberData.id, updatedMemberData)
        ]);

        alert(getLangText({
            he: 'השינויים נשמרו בהצלחה',
            en: 'Changes saved successfully'
        }, currentLang));
    } catch (error) {
        handleError(error);
    }
}

async function handleGalleryItemUpload(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        // Get the token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Authentication required');
        }

        // Add member ID to the form data
        formData.append('artist_id', memberData.id);

        await createGalleryItem(formData, token);

        alert(getLangText({
            he: 'פריט גלריה נוסף בהצלחה',
            en: 'Gallery item added successfully'
        }, currentLang));

        // Reload gallery data
        await loadMemberData();
        
        // Close modal
        const modal = document.getElementById('add-gallery-modal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        handleError(error);
    }
}

async function deleteGalleryItem(itemId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Authentication required');
        }

        const confirmDelete = confirm(getLangText({
            he: 'האם אתה בטוח שברצונך למחוק פריט זה?',
            en: 'Are you sure you want to delete this item?'
        }, currentLang));

        if (!confirmDelete) return;

        // Delete from database
        const { error } = await supabase
            .from('gallery_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Remove image from storage
        const { data: galleryItem } = await supabase
            .from('gallery_items')
            .select('image_url')
            .eq('id', itemId)
            .single();

        if (galleryItem && galleryItem.image_url) {
            const imagePath = galleryItem.image_url.split('/').pop();
            await deleteImage(imagePath, STORAGE_BUCKETS.GALLERY_ITEMS);
        }

        alert(getLangText({
            he: 'פריט הגלריה נמחק בהצלחה',
            en: 'Gallery item deleted successfully'
        }, currentLang));

        // Reload gallery data
        await loadMemberData();

    } catch (error) {
        handleError(error);
    }
}

function initMemberPage() {
    // Check authentication
    const isLoggedIn = localStorage.getItem('sessionToken') !== null;
    const currentUserId = localStorage.getItem('memberId');
    const memberId = getMemberIdFromUrl();

    if (!isLoggedIn || currentUserId !== memberId) {
        console.error('Unauthorized access to edit page');
        // Redirect to view mode or home page
        window.location.href = `member.html?id=${memberId}`;
        return;
    }

    loadMemberData();

    // Setup event listeners
    const saveButton = document.getElementById('save-changes-btn');
    if (saveButton) saveButton.addEventListener('click', saveChanges);

    const galleryUploadForm = document.getElementById('gallery-upload-form');
    if (galleryUploadForm) {
        galleryUploadForm.addEventListener('submit', handleGalleryItemUpload);
    }

    const galleryContainer = document.getElementById('member-gallery');
    if (galleryContainer) {
        galleryContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const itemId = event.target.dataset.id;
                deleteGalleryItem(itemId);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMemberPage);

// Expose functions for potential external use
window.initMemberPage = initMemberPage;
window.loadMemberData = loadMemberData;
