import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { getMemberById, updateMember, getAllCourses, getAllGalleryItems } from './api-service.js';

// Global state with clear structure
let currentLang = getCurrentLang();
let isEditMode = false;
let originalData = null;
let currentData = {
    memberDetails: null,
    allCourses: [],
    galleryItems: [],
    teachingRelationships: []
};
let isLoggedIn = localStorage.getItem('memberId') !== null;
let currentUserId = null;

// Enhanced Edit State Management
let pendingChanges = {
    galleryItems: [],
    courseTeachers: {
        added: [],
        removed: []
    }
};

async function loadMemberData(memberId) {
    try {
        const memberData = await getMemberById(memberId);
        currentData = memberData;

        // Update member details
        updateMemberDetails(memberData);

        // Fetch and render gallery items
        const galleryItems = await getAllGalleryItems();
        const memberGalleryItems = galleryItems.filter(item => item.artist_id === memberId);
        renderMemberGallery(memberGalleryItems);

        // Fetch and render courses
        const courses = await getAllCourses();
        renderMemberCourses(courses);
    } catch (error) {
        console.error('Error loading member data:', error);
    }
}

// Enhanced Edit Mode Management
function setupEditMode(memberId) {
    // Clear any existing edit buttons first
    const existingEditButton = document.getElementById('edit-mode-toggle');
    if (existingEditButton) {
        existingEditButton.remove();
    }

    // Check for edit mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shouldEnableEditMode = urlParams.get('edit') === 'true';

    // Check if current user is logged in and owns this profile
    const currentMemberId = localStorage.getItem('memberId');
    const isOwnProfile = isLoggedIn && memberId === currentMemberId;

    console.log('Edit Mode Setup Debug:', {
        memberId,
        currentMemberId,
        isLoggedIn,
        isOwnProfile,
        shouldEnableEditMode
    });

    // Create edit mode toggle button if edit=true or own profile
    if (shouldEnableEditMode || isOwnProfile) {
        // Create edit mode toggle button
        const editButton = document.createElement('button');
        editButton.id = 'edit-mode-toggle';
        editButton.className = 'nav-btn edit-mode-btn';
        editButton.innerHTML = `
            <span data-lang="he">ערוך פרופיל</span>
            <span data-lang="en">Edit Profile</span>
        `;
        
        // Add click event to toggle edit mode
        editButton.addEventListener('click', () => toggleEditMode());
        
        // Find appropriate container for edit button
        const navContainer = document.querySelector('.member-nav-container') || 
                             document.querySelector('nav') || 
                             document.body;
        
        navContainer.appendChild(editButton);

        if (shouldEnableEditMode) {
            console.log('Automatically enabling edit mode');
            toggleEditMode();
        }
    }
}

function toggleEditMode() {
    if (!isValidEditMode()) {
        console.warn('Edit mode not allowed');
        return;
    }

    isEditMode = !isEditMode;

    if (isEditMode) {
        // Capture original data before editing
        originalData = JSON.parse(JSON.stringify(currentData));
        
        // Prepare edit mode specific rendering
        fetchAllCoursesForEditMode();
        
        // Setup edit buttons
        const addGalleryButton = document.getElementById('add-gallery-item');
        const addCourseButton = document.getElementById('add-course-btn');
        
        if (addGalleryButton) addGalleryButton.style.display = 'block';
        if (addCourseButton) addCourseButton.style.display = 'block';
    } else {
        // Reset edit-specific buttons
        const addGalleryButton = document.getElementById('add-gallery-item');
        const addCourseButton = document.getElementById('add-course-btn');
        
        if (addGalleryButton) addGalleryButton.style.display = 'none';
        if (addCourseButton) addCourseButton.style.display = 'none';
    }

    updateEditModeUI();
}

function isValidEditMode() {
    // Ensure user is logged in
    if (!isLoggedIn) {
        console.warn('Edit mode requires login');
        return false;
    }

    // Verify profile ownership
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const currentMemberId = localStorage.getItem('memberId');

    return memberId && currentMemberId && memberId === currentMemberId;
}

function updateEditModeUI() {
    // Select editable elements
    const editableFields = document.querySelectorAll('.editable');
    const saveButton = document.getElementById('save-changes-btn');
    const cancelButton = document.getElementById('cancel-changes-btn');
    const editModeToggleButton = document.getElementById('edit-mode-toggle');

    // Toggle contentEditable and visual editing state
    editableFields.forEach(field => {
        field.contentEditable = isEditMode;
        field.classList.toggle('editing', isEditMode);
    });

    // Show/hide buttons based on edit mode
    if (saveButton) saveButton.style.display = isEditMode ? 'block' : 'none';
    if (cancelButton) cancelButton.style.display = isEditMode ? 'block' : 'none';

    // Optional: Add body class for global styling
    document.body.classList.toggle('edit-mode', isEditMode);

    // Update language display
    updateLanguageDisplay();
}

async function fetchAllCoursesForEditMode() {
    try {
        // Fetch all courses
        const courses = await getAllCourses();
        currentData.allCourses = courses;
        return courses;
    } catch (error) {
        console.error('Error fetching courses for edit mode:', error);
        return [];
    }
}

function renderMemberCourses(courses = [], isEditMode = false) {
    const coursesContainer = document.getElementById('member-courses');
    if (!coursesContainer) return;

    // Clear existing courses
    coursesContainer.innerHTML = '';

    // Filter courses the member teaches
    const memberCourses = filterCoursesForMember(courses, getMemberIdFromUrl(), isEditMode);

    // If no courses, show a message
    if (memberCourses.length === 0) {
        const noCoursesMessage = document.createElement('p');
        noCoursesMessage.textContent = getLangText({
            he: 'אין קורסים כרגע',
            en: 'No courses at the moment'
        }, currentLang);
        coursesContainer.appendChild(noCoursesMessage);
        return;
    }

    // Render courses
    memberCourses.forEach((course, index) => {
        const courseElement = createMemberCourseElement(course, index, isEditMode);
        coursesContainer.appendChild(courseElement);
    });
}

function createMemberCourseElement(course, index, isEditMode = false) {
    const courseDiv = document.createElement('div');
    courseDiv.classList.add('course-card');

    const title = currentLang === 'he' ? course.name_he : course.name_en;
    const description = currentLang === 'he' ? course.description_he : course.description_en;

    // Determine if current member is a teacher
    const memberId = getMemberIdFromUrl();
    const isMemberTeacher = course.teachers && 
        course.teachers.some(teacher => teacher && teacher.id === memberId);

    courseDiv.innerHTML = `
        <div class="course-content">
            <h3>${title || ''}</h3>
            <p class="course-description">${description || ''}</p>
        </div>
        ${isEditMode ? `
            <div class="course-edit-actions">
                <button class="add-teacher-btn" data-course-id="${course.id}">
                    ${getLangText({
                        he: isMemberTeacher ? 'הסר כמרצה' : 'הוסף כמרצה', 
                        en: isMemberTeacher ? 'Remove as Teacher' : 'Add as Teacher'
                    }, currentLang)}
                </button>
            </div>
        ` : ''}
    `;

    // Add event listener for adding/removing as teacher in edit mode
    if (isEditMode) {
        const addTeacherBtn = courseDiv.querySelector('.add-teacher-btn');
        addTeacherBtn.addEventListener('click', () => toggleMemberTeacherStatus(course, isMemberTeacher));
    }

    return courseDiv;
}

function toggleMemberTeacherStatus(course, isCurrentlyTeacher) {
    const memberId = getMemberIdFromUrl();

    if (isCurrentlyTeacher) {
        // Remove from teachers
        pendingChanges.courseTeachers.removed.push(course.id);
        pendingChanges.courseTeachers.added = 
            pendingChanges.courseTeachers.added.filter(id => id !== course.id);
    } else {
        // Add to teachers
        pendingChanges.courseTeachers.added.push(course.id);
        pendingChanges.courseTeachers.removed = 
            pendingChanges.courseTeachers.removed.filter(id => id !== course.id);
    }

    // Re-render to update UI
    renderMemberCourses(currentData.allCourses, true);
}

async function handleFieldEdit(event) {
    const field = event.target.dataset.field;
    const value = event.target.textContent;
    if (!currentData) currentData = {};
    currentData[field] = value;
}

async function saveChanges() {
    if (!isEditMode) return;

    try {
        // Validate session and authorization
        const sessionToken = localStorage.getItem('sessionToken');
        const memberId = getMemberIdFromUrl();

        if (!sessionToken) {
            throw new Error(getLangText({
                he: 'לא נמצא אסימון הזדהות. אנא התחבר מחדש.',
                en: 'No session token found. Please log in again.'
            }, currentLang));
        }

        // Prepare payload for backend
        const payload = {
            personalDetails: preparePersonalDetailsUpdate(),
            galleryItems: await prepareGalleryItemsUpdate(memberId, sessionToken),
            courseTeachers: prepareCourseTeachersUpdate()
        };

        // Validate changes exist
        if (isEmptyPayload(payload)) {
            toggleEditMode();
            return;
        }

        // Send comprehensive update to backend
        const response = await fetch(`${API_BASE_URL}/members/${memberId}/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || getLangText({
                he: 'שגיאה בעדכון הפרופיל',
                en: 'Error updating profile'
            }, currentLang));
        }

        // Update local data with server response
        const updatedMemberData = await response.json();
        updateLocalMemberData(updatedMemberData);

        // Reset edit mode and changes
        resetEditState();

        // Show success message
        showSuccessNotification(getLangText({
            he: 'הפרופיל עודכן בהצלחה',
            en: 'Profile updated successfully'
        }, currentLang));

    } catch (error) {
        console.error('Save Changes Error:', error);
        showErrorNotification(error.message);
    }
}

function preparePersonalDetailsUpdate() {
    const detailsToUpdate = {};
    const editableFields = [
        'name_he', 'name_en', 
        'role_he', 'role_en', 
        'bio_he', 'bio_en'
    ];

    editableFields.forEach(field => {
        const element = document.querySelector(`[data-field="${field}"]`);
        if (element) {
            const newValue = element.textContent.trim();
            if (newValue !== currentData[field]) {
                detailsToUpdate[field] = newValue;
            }
        }
    });

    return Object.keys(detailsToUpdate).length > 0 ? detailsToUpdate : null;
}

async function prepareGalleryItemsUpdate(memberId, sessionToken) {
    const galleryUpdates = {
        added: [],
        deleted: []
    };

    // Handle new gallery items
    for (const newItem of pendingChanges.galleryItems) {
        const formData = new FormData();
        formData.append('title_he', newItem.title_he);
        formData.append('title_en', newItem.title_en);
        formData.append('image', newItem.imageFile);

        try {
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/gallery`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload gallery item');
            }

            const uploadedItem = await response.json();
            galleryUpdates.added.push(uploadedItem);
        } catch (error) {
            console.error('Gallery Item Upload Error:', error);
        }
    }

    // Handle deleted gallery items
    const currentGalleryIds = currentData.galleryItems.map(item => item.id);
    const pendingGalleryIds = pendingChanges.galleryItems.map(item => item.id);
    galleryUpdates.deleted = currentGalleryIds.filter(id => !pendingGalleryIds.includes(id));

    return galleryUpdates.added.length > 0 || galleryUpdates.deleted.length > 0 ? galleryUpdates : null;
}

function prepareCourseTeachersUpdate() {
    const courseTeacherUpdates = {
        added: pendingChanges.courseTeachers.added.map(course => course.courseId),
        removed: pendingChanges.courseTeachers.removed
    };

    return courseTeacherUpdates.added.length > 0 || courseTeacherUpdates.removed.length > 0 
        ? courseTeacherUpdates 
        : null;
}

function isEmptyPayload(payload) {
    return !payload.personalDetails && 
           !payload.galleryItems && 
           !payload.courseTeachers;
}

function updateLocalMemberData(serverData) {
    // Update personal details
    if (serverData.personalDetails) {
        Object.keys(serverData.personalDetails).forEach(key => {
            currentData[key] = serverData.personalDetails[key];
        });
    }

    // Update gallery items
    if (serverData.galleryItems) {
        if (serverData.galleryItems.added) {
            currentData.galleryItems.push(...serverData.galleryItems.added);
        }
        if (serverData.galleryItems.deleted) {
            currentData.galleryItems = currentData.galleryItems.filter(
                item => !serverData.galleryItems.deleted.includes(item.id)
            );
        }
    }

    // Update course teachers
    if (serverData.courseTeachers) {
        // Implement course teacher update logic
        // This might involve updating currentData.allCourses or other related data
    }

    // Re-render updated sections
    renderMemberDetails(currentData);
    renderMemberGallery(currentData.galleryItems);
    renderMemberCourses(currentData.allCourses);
}

function resetEditState() {
    // Reset pending changes
    pendingChanges = {
        galleryItems: [],
        courseTeachers: { added: [], removed: [] }
    };

    // Exit edit mode
    toggleEditMode();
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function showAddGalleryItemForm() {
    if (!isEditMode) return;

    const modalHtml = `
        <div id="gallery-item-modal" class="modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 data-lang="he">הוסף פריט גלריה</h2>
                <h2 data-lang="en">Add Gallery Item</h2>
                <form id="gallery-item-form">
                    <input type="text" id="gallery-item-title-he" placeholder="כותרת בעברית" data-lang="he">
                    <input type="text" id="gallery-item-title-en" placeholder="English Title" data-lang="en">
                    <input type="file" id="gallery-item-image" accept="image/*">
                    <button type="submit" data-lang="he">שמור</button>
                    <button type="submit" data-lang="en">Save</button>
                </form>
            </div>
        </div>
    `;

    // Create and append modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    const modal = document.getElementById('gallery-item-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = modal.querySelector('form');

    closeBtn.onclick = () => modal.remove();
    form.onsubmit = (e) => {
        e.preventDefault();
        addGalleryItem();
    };

    modal.style.display = 'block';
    updateLanguageDisplay();
}

function addGalleryItem() {
    const titleHe = document.getElementById('gallery-item-title-he').value;
    const titleEn = document.getElementById('gallery-item-title-en').value;
    const imageFile = document.getElementById('gallery-item-image').files[0];

    if (!titleHe || !titleEn || !imageFile) {
        alert(getLangText({
            he: 'אנא מלא את כל השדות',
            en: 'Please fill all fields'
        }, currentLang));
        return;
    }

    const newGalleryItem = {
        id: Date.now(), // Temporary ID
        title_he: titleHe,
        title_en: titleEn,
        imageFile: imageFile,
        isNew: true
    };

    pendingChanges.galleryItems.push(newGalleryItem);
    renderPendingGalleryItems();
    document.getElementById('gallery-item-modal').remove();
}

function renderPendingGalleryItems() {
    const galleryContainer = document.getElementById('member-gallery');
    
    // Clear existing pending items
    const pendingItems = galleryContainer.querySelectorAll('.pending-gallery-item');
    pendingItems.forEach(item => item.remove());

    // Render new pending items
    pendingChanges.galleryItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('gallery-item', 'pending-gallery-item');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            itemElement.appendChild(img);
        };
        reader.readAsDataURL(item.imageFile);

        const titleElement = document.createElement('div');
        titleElement.textContent = currentLang === 'he' ? item.title_he : item.title_en;
        itemElement.appendChild(titleElement);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getLangText({
            he: 'מחק',
            en: 'Delete'
        }, currentLang);
        deleteBtn.onclick = () => removePendingGalleryItem(item.id);
        itemElement.appendChild(deleteBtn);

        galleryContainer.appendChild(itemElement);
    });
}

function removePendingGalleryItem(itemId) {
    pendingChanges.galleryItems = pendingChanges.galleryItems.filter(item => item.id !== itemId);
    renderPendingGalleryItems();
}

// Course Teacher Management
function showAddCourseForm() {
    if (!isEditMode) return;

    const modalHtml = `
        <div id="course-modal" class="modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 data-lang="he">הוסף קורס</h2>
                <h2 data-lang="en">Add Course</h2>
                <select id="course-select">
                    ${currentData.allCourses.map(course => 
                        `<option value="${course.id}">${course[`name_${currentLang}`]}</option>`
                    ).join('')}
                </select>
                <button id="add-course-btn" data-lang="he">הוסף</button>
                <button id="add-course-btn" data-lang="en">Add</button>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    const modal = document.getElementById('course-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const addBtn = modal.querySelector('#add-course-btn');

    closeBtn.onclick = () => modal.remove();
    addBtn.onclick = addCourseTeacher;

    modal.style.display = 'block';
    updateLanguageDisplay();
}

function addCourseTeacher() {
    const courseSelect = document.getElementById('course-select');
    const courseId = courseSelect.value;

    if (!courseId) {
        alert(getLangText({
            he: 'אנא בחר קורס',
            en: 'Please select a course'
        }, currentLang));
        return;
    }

    // Check if course is already added
    const isAlreadyAdded = pendingChanges.courseTeachers.added.some(c => c.courseId === courseId);
    if (isAlreadyAdded) {
        alert(getLangText({
            he: 'קורס זה כבר נוסף',
            en: 'This course is already added'
        }, currentLang));
        return;
    }

    const course = currentData.allCourses.find(c => c.id === courseId);
    pendingChanges.courseTeachers.added.push({
        courseId: courseId,
        courseName_he: course.name_he,
        courseName_en: course.name_en
    });

    renderPendingCourseTeachers();
    document.getElementById('course-modal').remove();
}

function renderPendingCourseTeachers() {
    const courseContainer = document.getElementById('member-courses');
    
    // Clear existing pending courses
    const pendingCourses = courseContainer.querySelectorAll('.pending-course');
    pendingCourses.forEach(course => course.remove());

    // Render new pending courses
    pendingChanges.courseTeachers.added.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.classList.add('course-item', 'pending-course');
        
        courseElement.textContent = currentLang === 'he' ? course.courseName_he : course.courseName_en;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getLangText({
            he: 'מחק',
            en: 'Delete'
        }, currentLang);
        deleteBtn.onclick = () => removePendingCourse(course.courseId);
        courseElement.appendChild(deleteBtn);

        courseContainer.appendChild(courseElement);
    });
}

function removePendingCourse(courseId) {
    pendingChanges.courseTeachers.added = 
        pendingChanges.courseTeachers.added.filter(c => c.courseId !== courseId);
    renderPendingCourseTeachers();
}

function updateMemberDetails(memberData) {
    // Set member image
    const memberImage = document.getElementById('member-image');
    if (memberImage) {
        memberImage.src = memberData.image_url || '';
    }

    // Set member name
    const nameHe = document.querySelector('[data-field="name_he"]');
    const nameEn = document.querySelector('[data-field="name_en"]');
    if (nameHe) nameHe.textContent = memberData.name_he || '';
    if (nameEn) nameEn.textContent = memberData.name_en || '';

    // Set member role
    const roleHe = document.querySelector('[data-field="role_he"]');
    const roleEn = document.querySelector('[data-field="role_en"]');
    if (roleHe) roleHe.textContent = memberData.role_he || '';
    if (roleEn) roleEn.textContent = memberData.role_en || '';

    // Set member bio
    const bioHe = document.querySelector('[data-field="bio_he"]');
    const bioEn = document.querySelector('[data-field="bio_en"]');
    if (bioHe) bioHe.textContent = memberData.bio_he || '';
    if (bioEn) bioEn.textContent = memberData.bio_en || '';
}

function renderMemberGallery(galleryItems = []) {
    const galleryGrid = document.getElementById('member-gallery-grid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '';

    // Add "Add Gallery Item" button in edit mode
    if (isEditMode) {
        const addButton = document.createElement('div');
        addButton.className = 'gallery-card add-gallery-item-button';
        addButton.innerHTML = `
            <div class="gallery-image" style="display: flex; align-items: center; justify-content: center; background: #f0f0f0; cursor: pointer;">
                <span style="font-size: 3rem; color: #007bff;">+</span>
            </div>
            <div class="gallery-info">
                <h3>${getLangText({
                    he: 'הוסף פריט גלריה',
                    en: 'Add Gallery Item'
                }, currentLang)}</h3>
            </div>
        `;
        addButton.addEventListener('click', showAddGalleryItemForm);
        galleryGrid.appendChild(addButton);
    }

    if (galleryItems.length === 0) {
        const noItemsMessage = document.createElement('p');
        noItemsMessage.textContent = getLangText({
            he: 'אין פריטים בגלריה',
            en: 'No items in gallery'
        }, currentLang);
        galleryGrid.appendChild(noItemsMessage);
        return;
    }

    galleryItems.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';

        const title = item.title || '';
        const description = item.description || '';

        card.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'placeholder.jpg'}" alt="${title}">
                ${isEditMode ? `
                    <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px; z-index: 10;">
                        <span style="background: rgba(255,255,255,0.8); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #007bff;" class="edit-gallery-item">✎</span>
                        <span style="background: rgba(255,255,255,0.8); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #dc3545;" class="delete-gallery-item">×</span>
                    </div>
                ` : ''}
            </div>
            <div class="gallery-info">
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;

        if (isEditMode) {
            const editButton = card.querySelector('.edit-gallery-item');
            const deleteButton = card.querySelector('.delete-gallery-item');

            editButton.addEventListener('click', () => showEditGalleryItemForm(item));
            deleteButton.addEventListener('click', () => deleteGalleryItem(item));
        }

        galleryGrid.appendChild(card);
    });
}

function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        if (el.getAttribute('data-lang') === currentLang) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

function getMemberIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function filterCoursesForMember(courses, memberId, isEditMode = false) {
    if (!courses || !memberId) return [];

    // In edit mode, show all courses
    if (isEditMode) {
        // If allCourses is not set, return the input courses
        return currentData.allCourses || courses;
    }

    // In view mode, filter courses the member teaches
    return courses.filter(course => 
        course.teachers && 
        course.teachers.some(teacher => teacher.memberId === memberId)
    );
}

// Modify existing initialization to include edit mode setup
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    
    if (memberId) {
        try {
            await loadMemberData(memberId);
            // setupEditMode(memberId);
            updateLanguageDisplay();
        } catch (error) {
            console.error('Error loading member data:', error);
        }
    }
});

window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    updateLanguageDisplay();
    
    // Reload member data with new language
    const memberId = getMemberIdFromUrl();
    loadMemberData(memberId);
};
