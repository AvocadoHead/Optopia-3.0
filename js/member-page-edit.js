import { 
    getMemberById, 
    getAllCourses, 
    getAllGalleryItems,
    getAllMembers,
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
    getMemberIdFromUrl,
    isLoggedIn
} from './utils.js';
import { uploadImage, deleteImage, STORAGE_BUCKETS } from './storage-utils.js';

// Global state variables
let currentLang = getCurrentLang() || 'he';
let memberData = null;
let coursesData = [];
let galleryData = [];
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

// Editing functions
function makeFieldsEditable() {
    const editableFields = [
        'member-name', 
        'member-role', 
        'member-bio'
    ];

    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.setAttribute('contenteditable', 'true');
            element.classList.add('editable-field');
        }
    });
}

function setupCourseSelectionListeners() {
    const coursesContainer = document.getElementById('member-courses');
    if (!coursesContainer) return;

    coursesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            checkbox.closest('.course-item').classList.toggle('selected', checkbox.checked);
        });
    });
}

function setupGalleryItemListeners() {
    const galleryContainer = document.getElementById('member-gallery');
    if (!galleryContainer) return;

    // Add gallery item button
    const addButton = document.getElementById('add-gallery-item-btn');
    if (addButton) {
        addButton.addEventListener('click', showAddGalleryItemModal);
    }

    // Delete gallery item buttons
    galleryContainer.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-btn');
        if (deleteBtn) {
            const itemId = deleteBtn.dataset.id;
            if (itemId) {
                deleteGalleryItem(itemId);
            }
        }
    });
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

function showAddGalleryItemModal() {
    const modal = document.getElementById('add-gallery-modal');
    if (modal) modal.style.display = 'block';
}

async function handleGalleryItemUpload(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Authentication required');
        }

        formData.append('artist_id', memberData.id);

        await createGalleryItem(formData, token);

        alert(getLangText({
            he: 'פריט גלריה נוסף בהצלחה',
            en: 'Gallery item added successfully'
        }, currentLang));

        // Reload gallery data
        await loadMemberData();
        
        const modal = document.getElementById('add-gallery-modal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        handleError(error);
    }
}

async function loadMemberData() {
    try {
        // Get member ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('id');
        
        if (!memberId) {
            throw new Error('No member ID found in URL');
        }

        // Find member in pre-loaded data
        const member = membersData.find(m => m.id === memberId);
        
        if (!member) {
            throw new Error('Member not found');
        }

        memberData = member;

        // Setup edit-specific functionality
        makeFieldsEditable();
        setupCourseSelectionListeners();
        setupGalleryItemListeners();
        populateEditFields(member);
        setupSaveButton();
        setupGalleryUploadForm();
    } catch (error) {
        handleError(error);
    }
}

function populateEditFields(member) {
    // Populate editable fields with member data
    const nameElement = document.getElementById('member-name');
    const roleElement = document.getElementById('member-role');
    const bioElement = document.getElementById('member-bio');

    if (nameElement) nameElement.textContent = member[`name_${currentLang}`] || '';
    if (roleElement) roleElement.textContent = member[`role_${currentLang}`] || '';
    if (bioElement) bioElement.textContent = member[`bio_${currentLang}`] || '';

    // Populate courses
    const coursesContainer = document.getElementById('member-courses');
    if (coursesContainer) {
        coursesContainer.innerHTML = ''; // Clear existing courses
        const memberCourses = coursesData.filter(course => 
            course.teachers && course.teachers.some(teacher => teacher.id === member.id)
        );
        
        memberCourses.forEach(course => {
            const courseItem = document.createElement('div');
            courseItem.className = 'course-item';
            courseItem.innerHTML = `
                <input type="checkbox" id="course-${course.id}">
                <label for="course-${course.id}">${course[`title_${currentLang}`] || 'Untitled Course'}</label>
            `;
            coursesContainer.appendChild(courseItem);
        });
    }

    // Populate gallery items
    const galleryContainer = document.getElementById('member-gallery');
    if (galleryContainer) {
        galleryContainer.innerHTML = ''; // Clear existing gallery items
        const memberGalleryItems = galleryData.filter(item => item.artist === member.id);
        
        memberGalleryItems.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.innerHTML = `
                <img src="${item.imageUrl}" alt="${item[`title_${currentLang}`] || 'Gallery Item'}">
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            `;
            galleryContainer.appendChild(galleryItem);
        });
    }
}

function setupSaveButton() {
    const saveButton = document.getElementById('save-changes-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveChanges);
    }
}

function setupGalleryUploadForm() {
    const uploadForm = document.getElementById('add-gallery-item-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleGalleryItemUpload);
    }
}

function initializeMemberEditPage() {
    if (!isLoggedIn()) {
        alert(getLangText({
            he: 'אינך מחובר. אנא התחבר.',
            en: 'You are not logged in. Please log in.'
        }, currentLang));
        window.location.href = 'login.html';
        return;
    }

    // Initialize app data first
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Ensure app data is initialized
            const { galleryData: gallery, coursesData: courses, membersData: members } = await initializeAppData();
            
            // Update global variables
            galleryData = gallery;
            coursesData = courses;
            membersData = members;

            // Load member data
            loadMemberData();
        } catch (error) {
            handleError(error);
        }
    });
}

// Initialize the page
initializeMemberEditPage();
