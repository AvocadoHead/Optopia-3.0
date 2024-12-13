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

// Global variable to track course teacher changes
let pendingCourseTeacherChanges = {
    addTeachers: [],
    removeTeachers: []
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

function setupEditMode(memberId) {
    console.group('🛠️ Edit Mode Setup');
    
    // Check if edit mode should be enabled
    const urlParams = new URLSearchParams(window.location.search);
    const currentMemberId = localStorage.getItem('memberId');
    const shouldEnableEditMode = urlParams.get('edit') === 'true' && isLoggedIn;
    
    console.log('Edit Mode Parameters:', {
        urlMemberId: memberId,
        currentMemberId,
        isLoggedIn,
        shouldEnableEditMode
    });

    // Only create edit button if viewing own profile
    if (isLoggedIn && memberId === currentMemberId) {
        // Create edit button dynamically
        const editButton = document.createElement('button');
        editButton.id = 'edit-mode-toggle';
        editButton.classList.add('nav-btn', 'edit-mode-btn');
        editButton.innerHTML = `
            <span data-lang="he">ערוך פרופיל</span>
            <span data-lang="en" style="display:none;">Edit Profile</span>
        `;
        editButton.addEventListener('click', toggleEditMode);
        
        // Find a suitable location to insert the edit button
        const navContainer = document.querySelector('.member-nav-container') || 
                             document.querySelector('nav') || 
                             document.body;
        
        navContainer.appendChild(editButton);

        // Conditionally show edit mode if requested
        if (shouldEnableEditMode) {
            console.log('🔓 Automatically enabling edit mode');
            toggleEditMode();
        }
    }

    console.groupEnd();
}

function toggleEditMode() {
    if (!isValidEditMode()) {
        return;
    }

    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);

    // Get references to buttons
    const editModeToggleButton = document.getElementById('edit-mode-toggle');
    const saveButton = document.getElementById('save-changes');
    const discardButton = document.getElementById('cancel-changes');
    const addGalleryItemButton = document.getElementById('add-gallery-item');

    // Update edit mode toggle button
    if (editModeToggleButton) {
        editModeToggleButton.style.display = isEditMode ? 'none' : 'block';
    }

    // Show/hide save and discard buttons
    if (saveButton) {
        saveButton.style.display = isEditMode ? 'block' : 'none';
        saveButton.onclick = saveChanges;
    }

    if (discardButton) {
        discardButton.style.display = isEditMode ? 'block' : 'none';
        discardButton.onclick = cancelChanges;
    }

    // Toggle add gallery item button
    if (addGalleryItemButton) {
        addGalleryItemButton.style.display = isEditMode ? 'block' : 'none';
    }

    // Make editable fields content-editable
    const editables = document.querySelectorAll('.editable');
    editables.forEach(field => {
        field.contentEditable = isEditMode;
        if (isEditMode) {
            field.addEventListener('blur', handleFieldEdit);
        } else {
            field.removeEventListener('blur', handleFieldEdit);
        }
    });

    if (isEditMode) {
        // Store original data before editing
        originalData = JSON.parse(JSON.stringify(currentData));
        
        // In edit mode, fetch and show ALL courses
        fetchAllCoursesForEditMode();
        renderMemberGallery(currentData.galleryItems);
    } else {
        // In view mode, show only member's courses
        renderMemberCourses(currentData.allCourses);
    }

    // Add event listener for add gallery item button
    if (isEditMode) {
        addGalleryItemButton.addEventListener('click', showAddGalleryItemForm);
    } else {
        addGalleryItemButton.removeEventListener('click', showAddGalleryItemForm);
    }
}

async function fetchAllCoursesForEditMode() {
    try {
        // Fetch all courses
        const allCourses = await getAllCourses();
        
        // Render all courses in edit mode
        renderMemberCourses(allCourses, true);
    } catch (error) {
        console.error('Error fetching all courses for edit mode:', error);
    }
}

function renderMemberCourses(courses = [], isEditMode = false) {
    const coursesContainer = document.getElementById('member-courses-container');
    if (!coursesContainer) return;

    // Clear previous content
    coursesContainer.innerHTML = '';

    // Filter courses if not in edit mode
    const memberId = getMemberIdFromUrl();
    const filteredCourses = isEditMode ? 
        courses : 
        filterCoursesForMember(courses, memberId);

    // Render courses
    filteredCourses.forEach((course, index) => {
        const courseElement = createMemberCourseElement(course, index, isEditMode);
        coursesContainer.appendChild(courseElement);
    });

    // Add "Add Course" button in edit mode
    if (isEditMode) {
        const addCourseButton = document.createElement('button');
        addCourseButton.id = 'add-course-btn';
        addCourseButton.classList.add('nav-btn');
        addCourseButton.textContent = getLangText({
            he: 'הוסף קורס',
            en: 'Add Course'
        }, currentLang);
        addCourseButton.addEventListener('click', showAddCourseForm);
        coursesContainer.appendChild(addCourseButton);
    }
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
        pendingCourseTeacherChanges.removeTeachers.push(course.id);
        pendingCourseTeacherChanges.addTeachers = 
            pendingCourseTeacherChanges.addTeachers.filter(id => id !== course.id);
    } else {
        // Add to teachers
        pendingCourseTeacherChanges.addTeachers.push(course.id);
        pendingCourseTeacherChanges.removeTeachers = 
            pendingCourseTeacherChanges.removeTeachers.filter(id => id !== course.id);
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
    try {
        console.log('Attempting to save changes');
        
        // Get session token from localStorage
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            throw new Error('No session token found. Please log in.');
        }

        // Validate edit mode and permissions
        if (!isValidEditMode()) {
            throw new Error('Invalid edit mode or unauthorized access');
        }

        // Prepare member data to update
        const updatedMemberData = {
            name_he: document.querySelector('[data-field="name_he"]').textContent,
            name_en: document.querySelector('[data-field="name_en"]').textContent,
            role_he: document.querySelector('[data-field="role_he"]').textContent,
            role_en: document.querySelector('[data-field="role_en"]').textContent,
            bio_he: document.querySelector('[data-field="bio_he"]').textContent,
            bio_en: document.querySelector('[data-field="bio_en"]').textContent
        };

        // Get member ID from URL
        const memberId = getMemberIdFromUrl();

        // Update member details with explicit authorization
        const updatedMember = await updateMember(memberId, updatedMemberData, sessionToken);

        // Handle course teacher changes
        if (pendingCourseTeacherChanges.addTeachers.length > 0 || 
            pendingCourseTeacherChanges.removeTeachers.length > 0) {
            // Implement course teacher update logic here
            console.log('Pending course teacher changes:', pendingCourseTeacherChanges);
        }

        // Reset edit mode
        toggleEditMode();
        
        console.log('Changes saved successfully');
    } catch (error) {
        console.error('Error saving changes:', error);
        alert(error.message || 'Failed to save changes. Please try again.');
    }
}

function showAddGalleryItemForm() {
    const dialogContent = `
        <div class="add-gallery-item-dialog">
            <h2>${getLangText({
                he: 'הוסף פריט גלריה',
                en: 'Add Gallery Item'
            }, currentLang)}</h2>
            
            <label for="gallery-item-title">${getLangText({
                he: 'כותרת',
                en: 'Title'
            }, currentLang)}</label>
            <input type="text" id="gallery-item-title" required>
            
            <label for="gallery-item-description">${getLangText({
                he: 'תיאור',
                en: 'Description'
            }, currentLang)}</label>
            <textarea id="gallery-item-description" rows="4"></textarea>
            
            <label for="gallery-item-image">${getLangText({
                he: 'תמונה',
                en: 'Image'
            }, currentLang)}</label>
            <input type="file" id="gallery-item-image" accept="image/*" required>
            
            <div class="dialog-buttons">
                <button id="save-new-gallery-item">${getLangText({
                    he: 'שמור',
                    en: 'Save'
                }, currentLang)}</button>
                <button id="cancel-new-gallery-item">${getLangText({
                    he: 'בטל',
                    en: 'Cancel'
                }, currentLang)}</button>
            </div>
        </div>
    `;

    // Create and show dialog
    const dialog = createDialog(dialogContent);
    
    const saveButton = dialog.querySelector('#save-new-gallery-item');
    const cancelButton = dialog.querySelector('#cancel-new-gallery-item');
    
    cancelButton.addEventListener('click', () => dialog.close());
    
    saveButton.addEventListener('click', async () => {
        try {
            const memberId = getMemberIdFromUrl();
            const token = localStorage.getItem('sessionToken');
            
            if (!token) {
                throw new Error(getLangText({
                    he: 'לא נמצא אסימון הזדהות. אנא התחבר מחדש.',
                    en: 'No session token found. Please log in again.'
                }, currentLang));
            }

            const formData = new FormData();
            const titleInput = dialog.querySelector('#gallery-item-title');
            const descriptionInput = dialog.querySelector('#gallery-item-description');
            const imageInput = dialog.querySelector('#gallery-item-image');

            // Validate inputs
            if (!titleInput.value) {
                alert(getLangText({
                    he: 'אנא הזן כותרת',
                    en: 'Please enter a title'
                }, currentLang));
                return;
            }

            if (!imageInput.files.length) {
                alert(getLangText({
                    he: 'אנא בחר תמונה',
                    en: 'Please select an image'
                }, currentLang));
                return;
            }

            formData.append('title', titleInput.value);
            formData.append('description', descriptionInput.value || '');
            formData.append('image', imageInput.files[0]);

            const response = await fetch(`${API_BASE_URL}/members/${memberId}/gallery`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 
                    getLangText({
                        he: 'שגיאה ביצירת פריט גלריה',
                        en: 'Failed to create gallery item'
                    }, currentLang)
                );
            }

            const newItem = await response.json();
            
            // Update local state and re-render
            if (!currentData.galleryItems) {
                currentData.galleryItems = [];
            }
            currentData.galleryItems.push(newItem);
            
            renderMemberGallery(currentData.galleryItems);
            dialog.close();

            alert(getLangText({
                he: 'פריט הגלריה נוסף בהצלחה',
                en: 'Gallery item added successfully'
            }, currentLang));
        } catch (error) {
            console.error('Error adding gallery item:', error);
            alert(error.message);
        }
    });
}

function showAddCourseForm(course, index) {
    if (!isValidEditMode()) {
        return;
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <form class="edit-form">
            <h3>
                <span data-lang="he">הוסף קורס</span>
                <span data-lang="en" style="display:none;">Add Course</span>
            </h3>
            <div class="form-group">
                <label>
                    <span data-lang="he">שם הקורס בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Course Name</span>
                </label>
                <input type="text" name="name_he" value="${course ? course.name_he : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">שם הקורס באנגלית</span>
                    <span data-lang="en" style="display:none;">English Course Name</span>
                </label>
                <input type="text" name="name_en" value="${course ? course.name_en : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">תיאור בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Description</span>
                </label>
                <textarea name="description_he" required>${course ? course.description_he : ''}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">תיאור באנגלית</span>
                    <span data-lang="en" style="display:none;">English Description</span>
                </label>
                <textarea name="description_en" required>${course ? course.description_en : ''}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">רמת קושי בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Difficulty</span>
                </label>
                <input type="text" name="difficulty_he" value="${course ? course.difficulty_he : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">רמת קושי באנגלית</span>
                    <span data-lang="en" style="display:none;">English Difficulty</span>
                </label>
                <input type="text" name="difficulty_en" value="${course ? course.difficulty_en : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">משך בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Duration</span>
                </label>
                <input type="text" name="duration_he" value="${course ? course.duration_he : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">משך באנגלית</span>
                    <span data-lang="en" style="display:none;">English Duration</span>
                </label>
                <input type="text" name="duration_en" value="${course ? course.duration_en : ''}" required>
            </div>
            <div class="button-group">
                <button type="submit" class="nav-btn">
                    <span data-lang="he">שמור</span>
                    <span data-lang="en" style="display:none;">Save</span>
                </button>
                <button type="button" class="nav-btn" onclick="this.closest('dialog').close()">
                    <span data-lang="he">ביטול</span>
                    <span data-lang="en" style="display:none;">Cancel</span>
                </button>
            </div>
        </form>
    `;
    
    dialog.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newCourse = {
            name_he: formData.get('name_he'),
            name_en: formData.get('name_en'),
            description_he: formData.get('description_he'),
            description_en: formData.get('description_en'),
            difficulty_he: formData.get('difficulty_he'),
            difficulty_en: formData.get('difficulty_en'),
            duration_he: formData.get('duration_he'),
            duration_en: formData.get('duration_en')
        };
        
        if (course) {
            currentData.courses[index] = newCourse;
        } else {
            if (!currentData.courses) {
                currentData.courses = [];
            }
            currentData.courses.push(newCourse);
        }
        renderMemberCourses(currentData.courses);
        dialog.close();
    });
    
    document.body.appendChild(dialog);
    dialog.showModal();
    updateLanguageDisplay();
}

function showEditGalleryItemForm(item, index) {
    const dialogContent = `
        <div class="add-gallery-item-dialog">
            <h2>${getLangText({
                he: 'ערוך פריט גלריה',
                en: 'Edit Gallery Item'
            }, currentLang)}</h2>
            
            <label for="gallery-item-title">${getLangText({
                he: 'כותרת',
                en: 'Title'
            }, currentLang)}</label>
            <input type="text" id="gallery-item-title" value="${item.title || ''}" required>
            
            <label for="gallery-item-description">${getLangText({
                he: 'תיאור',
                en: 'Description'
            }, currentLang)}</label>
            <textarea id="gallery-item-description" rows="4">${item.description || ''}</textarea>
            
            <label for="gallery-item-image">${getLangText({
                he: 'תמונה',
                en: 'Image'
            }, currentLang)}</label>
            <input type="file" id="gallery-item-image" accept="image/*">
            
            <div class="dialog-buttons">
                <button id="save-gallery-item">${getLangText({
                    he: 'שמור',
                    en: 'Save'
                }, currentLang)}</button>
                <button id="cancel-gallery-item">${getLangText({
                    he: 'בטל',
                    en: 'Cancel'
                }, currentLang)}</button>
            </div>
        </div>
    `;

    // Create dialog
    const dialog = createDialog(dialogContent);
    
    // Reference elements
    const titleInput = dialog.querySelector('#gallery-item-title');
    const descriptionInput = dialog.querySelector('#gallery-item-description');
    const imageInput = dialog.querySelector('#gallery-item-image');
    const saveButton = dialog.querySelector('#save-gallery-item');
    const cancelButton = dialog.querySelector('#cancel-gallery-item');

    // Cancel button
    cancelButton.addEventListener('click', () => {
        dialog.close();
    });

    // Save button
    saveButton.addEventListener('click', async () => {
        try {
            // Get member ID from URL
            const memberId = getMemberIdFromUrl();
            
            // Prepare authorization token
            const token = localStorage.getItem('sessionToken');
            if (!token) {
                throw new Error(
                    getLangText({
                        he: 'לא נמצא אסימון הזדהות. אנא התחבר מחדש.',
                        en: 'No session token found. Please log in again.'
                    }, currentLang)
                );
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('title', titleInput.value);
            formData.append('description', descriptionInput.value);

            // Add image if selected
            if (imageInput.files.length > 0) {
                formData.append('image', imageInput.files[0]);
            }

            // Send request to backend to update gallery item
            const response = await fetch(`${API_BASE_URL}/members/${memberId}/gallery/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 
                    getLangText({
                        he: 'שגיאה בעדכון פריט הגלריה',
                        en: 'Failed to update gallery item'
                    }, currentLang)
                );
            }

            // Parse updated item
            const updatedItem = await response.json();

            // Update local state
            currentData.galleryItems[index] = updatedItem;
            
            // Re-render gallery
            renderMemberGallery(currentData.galleryItems);

            // Close dialog
            dialog.close();

            // Show success message
            alert(
                getLangText({
                    he: 'פריט הגלריה עודכן בהצלחה',
                    en: 'Gallery item updated successfully'
                }, currentLang)
            );
        } catch (error) {
            console.error('Error updating gallery item:', error);
            alert(error.message);
        }
    });
}

function deleteGalleryItem(index) {
    if (currentData.galleryItems) {
        currentData.galleryItems.splice(index, 1);
        saveChanges();
        renderMemberGallery(currentData.galleryItems);
    }
}

function cancelChanges() {
    // Restore original data
    if (originalData) {
        currentData = JSON.parse(JSON.stringify(originalData));
        
        // Revert UI to original state
        updateMemberDetails(currentData);
        renderMemberCourses(currentData.allCourses);
        renderMemberGallery(currentData.galleryItems);
    }

    // Exit edit mode
    toggleEditMode();
}

async function saveChanges() {
    try {
        console.log('Attempting to save changes');
        
        // Get session token from localStorage
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            throw new Error('No session token found. Please log in.');
        }

        // Validate edit mode and permissions
        if (!isValidEditMode()) {
            throw new Error('Invalid edit mode or unauthorized access');
        }

        // Prepare member data to update
        const updatedMemberData = {
            name_he: document.querySelector('[data-field="name_he"]').textContent,
            name_en: document.querySelector('[data-field="name_en"]').textContent,
            role_he: document.querySelector('[data-field="role_he"]').textContent,
            role_en: document.querySelector('[data-field="role_en"]').textContent,
            bio_he: document.querySelector('[data-field="bio_he"]').textContent,
            bio_en: document.querySelector('[data-field="bio_en"]').textContent
        };

        // Get member ID from URL
        const memberId = getMemberIdFromUrl();

        // Update member details with explicit authorization
        const updatedMember = await updateMember(memberId, updatedMemberData, sessionToken);

        // Handle course teacher changes
        if (pendingCourseTeacherChanges.addTeachers.length > 0 || 
            pendingCourseTeacherChanges.removeTeachers.length > 0) {
            // TODO: Implement backend API call to update course teacher relationships
            console.log('Pending course teacher changes:', pendingCourseTeacherChanges);
            
            // Reset pending changes after saving
            pendingCourseTeacherChanges = {
                addTeachers: [],
                removeTeachers: []
            };
        }

        // Update original data after successful save
        originalData = JSON.parse(JSON.stringify(currentData));

        // Reset edit mode
        toggleEditMode();
        
        console.log('Changes saved successfully');
        
        // Optional: Show success message
        alert(getLangText({
            he: 'השינויים נשמרו בהצלחה',
            en: 'Changes saved successfully'
        }, currentLang));
    } catch (error) {
        console.error('Error saving changes:', error);
        alert(error.message || getLangText({
            he: 'שגיאה בשמירת השינויים',
            en: 'Failed to save changes'
        }, currentLang));
    }
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
    if (isEditMode) {
        return courses;
    }

    // In non-edit mode, only show courses where the member teaches
    const filteredCourses = courses.filter(course => {
        if (!course.teachers || course.teachers.length === 0) return false;

        return course.teachers.some(teacher => 
            teacher.id === memberId
        );
    });

    return filteredCourses;
}

function isValidEditMode() {
    // Check if user is logged in
    if (!isLoggedIn) {
        console.warn('Edit mode not allowed: User not logged in');
        return false;
    }

    // Get current member ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const currentMemberId = localStorage.getItem('memberId');

    // Validate that the user is editing their own profile
    if (!memberId || !currentMemberId || memberId !== currentMemberId) {
        console.warn('Edit mode not allowed: Unauthorized profile access', {
            urlMemberId: memberId,
            currentMemberId: currentMemberId
        });
        return false;
    }

    return true;
}


window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    updateLanguageDisplay();
    
    // Reload member data with new language
    const memberId = getMemberIdFromUrl();
    loadMemberData(memberId);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const editMode = urlParams.get('edit') === 'true';
    
    console.log('Page Initialization Debug:', {
        memberId,
        editMode,
        isLoggedIn,
        currentMemberId: localStorage.getItem('memberId')
    });

    if (memberId) {
        try {
            await loadMemberData(memberId);
            
            // Explicitly set edit mode if requested and user is logged in
            if (editMode && isLoggedIn && memberId === localStorage.getItem('memberId')) {
                console.log('Enabling Edit Mode');
                toggleEditMode();
            }
            
            updateLanguageDisplay();
        } catch (error) {
            console.error('Error loading member data:', error);
        }
    }
});
