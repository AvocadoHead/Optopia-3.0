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
        editButton.id = 'edit-button';
        editButton.classList.add('nav-btn');
        editButton.innerHTML = `
            <span data-lang="he">ערוך פרופיל</span>
            <span data-lang="en">Edit Profile</span>
        `;
        editButton.addEventListener('click', toggleEditMode);
        
        // Find a suitable location to insert the edit button (e.g., near other navigation buttons)
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

    const editButton = document.getElementById('edit-button');
    if (!editButton) {
        console.error('Edit button not found');
        return;
    }

    console.log('Toggle Edit Mode - Current State:', {
        isEditMode, 
        isLoggedIn, 
        currentUserId: localStorage.getItem('memberId')
    });

    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);
    
    // Create save and discard buttons if they don't exist
    let saveButton = document.getElementById('save-changes-button');
    let discardButton = document.getElementById('discard-changes-button');

    if (!saveButton) {
        saveButton = document.createElement('button');
        saveButton.id = 'save-changes-button';
        saveButton.classList.add('nav-btn');
        saveButton.innerHTML = `
            <span data-lang="he">שמור שינויים</span>
            <span data-lang="en">Save Changes</span>
        `;
        saveButton.addEventListener('click', saveChanges);
        editButton.parentNode.insertBefore(saveButton, editButton.nextSibling);
        
        // Initially hide the save button
        saveButton.style.display = 'none';
    }

    if (!discardButton) {
        discardButton = document.createElement('button');
        discardButton.id = 'discard-changes-button';
        discardButton.classList.add('nav-btn');
        discardButton.innerHTML = `
            <span data-lang="he">בטל שינויים</span>
            <span data-lang="en">Discard Changes</span>
        `;
        discardButton.addEventListener('click', cancelChanges);
        editButton.parentNode.insertBefore(discardButton, saveButton.nextSibling);
        
        // Initially hide the discard button
        discardButton.style.display = 'none';
    }

    // Toggle visibility of save/discard buttons only when in edit mode
    saveButton.style.display = isEditMode ? 'block' : 'none';
    discardButton.style.display = isEditMode ? 'block' : 'none';
    
    // Update edit button text
    if (currentLang === 'he') {
        editButton.querySelector('[data-lang="he"]').textContent = isEditMode ? 'סיים עריכה' : 'ערוך פרופיל';
    } else {
        editButton.querySelector('[data-lang="en"]').textContent = isEditMode ? 'Finish Editing' : 'Edit Profile';
    }

    // Show/hide add buttons
    const addButtons = document.querySelectorAll('#add-gallery-item, #add-course');
    addButtons.forEach(button => {
        if (button) button.style.display = isEditMode ? 'block' : 'none';
    });

    if (isEditMode) {
        // Make fields editable
        const editables = document.querySelectorAll('.editable');
        editables.forEach(field => {
            field.contentEditable = true;
            field.addEventListener('blur', handleFieldEdit);
        });

        // Re-render courses to show all available ones
        renderMemberCourses();
    } else {
        // Make fields non-editable
        const editables = document.querySelectorAll('.editable');
        editables.forEach(field => {
            field.contentEditable = false;
            field.removeEventListener('blur', handleFieldEdit);
        });

        // Re-render courses to show only teaching ones
        renderMemberCourses();
    }
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

function showAddGalleryItemForm(item, index) {
    if (!isValidEditMode()) {
        return;
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <form class="edit-form">
            <h3>
                <span data-lang="he">הוסף פריט לגלריה</span>
                <span data-lang="en" style="display:none;">Add Gallery Item</span>
            </h3>
            <div class="form-group">
                <label>
                    <span data-lang="he">כותרת בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Title</span>
                </label>
                <input type="text" name="title_he" value="${item ? item.title_he : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">כותרת באנגלית</span>
                    <span data-lang="en" style="display:none;">English Title</span>
                </label>
                <input type="text" name="title_en" value="${item ? item.title_en : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">תיאור בעברית</span>
                    <span data-lang="en" style="display:none;">Hebrew Description</span>
                </label>
                <textarea name="description_he" required>${item ? item.description_he : ''}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">תיאור באנגלית</span>
                    <span data-lang="en" style="display:none;">English Description</span>
                </label>
                <textarea name="description_en" required>${item ? item.description_en : ''}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <span data-lang="he">קישור לתמונה</span>
                    <span data-lang="en" style="display:none;">Image URL</span>
                </label>
                <input type="url" name="image_url" value="${item ? item.image_url : ''}" required>
            </div>
            <div class="button-group">
                <button type="submit" class="nav-btn">
                    <span data-lang="he">שמור</span>
                    <span data-lang="en" style="display:none;">Save</span>
                </button>
                <button type="button" class="nav-btn" onclick="this.closest('dialog').close()">
                    <span data-lang="he">בטל</span>
                    <span data-lang="en" style="display:none;">Cancel</span>
                </button>
            </div>
        </form>
    `;
    
    dialog.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newItem = {
            title_he: formData.get('title_he'),
            title_en: formData.get('title_en'),
            description_he: formData.get('description_he'),
            description_en: formData.get('description_en'),
            image_url: formData.get('image_url')
        };
        
        try {
            // Get member ID from URL
            const memberId = getMemberIdFromUrl();
            
            // Prepare authorization token
            const token = localStorage.getItem('sessionToken');
            if (!token) {
                throw new Error('No session token found');
            }

            // Send request to backend to add gallery item
            const response = await fetch(`/api/members/${memberId}/gallery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newItem)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add gallery item');
            }

            const addedItem = await response.json();
            
            // Update local state
            if (!currentData.galleryItems) {
                currentData.galleryItems = [];
            }
            currentData.galleryItems.push(addedItem);
            
            // Re-render gallery
            renderMemberGallery(currentData.galleryItems);
            
            // Close dialog
            dialog.close();
        } catch (error) {
            console.error('Error adding gallery item:', error);
            alert(error.message || 'Failed to add gallery item');
        }
    });
    
    document.body.appendChild(dialog);
    dialog.showModal();
    updateLanguageDisplay();
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

function addToCourse(courseId) {
    // This function is now handled directly in renderMemberCourses
    console.warn('addToCourse is deprecated. Use the "+" button in edit mode.');
}

function deleteGalleryItem(index) {
    if (currentData.galleryItems) {
        currentData.galleryItems.splice(index, 1);
        saveChanges();
        renderMemberGallery(currentData.galleryItems);
    }
}

function cancelChanges() {
    if (!isValidEditMode()) {
        return;
    }

    currentData = { ...originalData };
    updateMemberDetails(originalData);
    renderMemberGallery(originalData.galleryItems || []);
    renderMemberCourses(originalData.courses || []);
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
    if (!galleryGrid) {
        console.error('❌ Gallery Grid Not Found');
        return;
    }

    galleryGrid.innerHTML = '';

    if (galleryItems.length === 0) {
        galleryGrid.innerHTML = `
            <p class="no-items-message">
                <span data-lang="he">אין פריטים בגלריה</span>
                <span data-lang="en">No items in gallery</span>
            </p>`;
        return;
    }

    galleryItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;
        const description = currentLang === 'he' ? item.description_he : item.description_en;
        
        card.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'placeholder.jpg'}" alt="${title || 'Gallery Item'}">
                ${isEditMode ? `
                    <div class="gallery-edit-controls">
                        <span class="edit-gallery-item" data-index="${index}">✎</span>
                        <span class="delete-gallery-item" data-index="${index}">×</span>
                    </div>
                ` : ''}
            </div>
            <div class="gallery-info">
                <h3>${title || ''}</h3>
                <p>${description || ''}</p>
            </div>
        `;
        
        // Add edit and delete functionality if in edit mode
        if (isEditMode) {
            const editButton = card.querySelector('.edit-gallery-item');
            const deleteButton = card.querySelector('.delete-gallery-item');

            editButton.addEventListener('click', () => {
                showEditGalleryItemForm(item, index);
            });

            deleteButton.addEventListener('click', async () => {
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

                    // Send request to backend to delete gallery item
                    const response = await fetch(`${API_BASE_URL}/members/${memberId}/gallery/${item.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 
                            getLangText({
                                he: 'שגיאה במחיקת פריט הגלריה',
                                en: 'Failed to delete gallery item'
                            }, currentLang)
                        );
                    }

                    // Remove item from local state
                    currentData.galleryItems = currentData.galleryItems.filter(
                        galleryItem => galleryItem.id !== item.id
                    );
                    
                    // Re-render gallery
                    renderMemberGallery(currentData.galleryItems);

                    alert(
                        getLangText({
                            he: 'פריט הגלריה נמחק בהצלחה',
                            en: 'Gallery item deleted successfully'
                        }, currentLang)
                    );
                } catch (error) {
                    console.error('Error deleting gallery item:', error);
                    alert(error.message);
                }
            });
        } else {
            // Add click event listener to redirect to gallery item page with full repository path
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                window.location.href = `https://avocadohead.github.io/Optopia-3.0/gallery-item.html?id=${item.id}`;
            });
        }
        
        galleryGrid.appendChild(card);
    });
}

function renderMemberCourses(courses = []) {
    const coursesGrid = document.getElementById('member-courses-grid');
    coursesGrid.innerHTML = ''; // Clear previous content

    const currentLang = getCurrentLang();
    const memberId = getMemberIdFromUrl();
    const currentMemberId = localStorage.getItem('memberId');

    // Reset pending changes
    pendingCourseTeacherChanges = {
        addTeachers: [],
        removeTeachers: []
    };

    // Determine which courses to show
    let coursesToRender = filterCoursesForMember(courses, memberId, isEditMode);

    if (coursesToRender.length === 0) {
        coursesGrid.innerHTML = `
            <p class="no-courses-message">
                <span data-lang="he">אין קורסים</span>
                <span data-lang="en">No courses</span>
            </p>`;
        return;
    }

    coursesToRender.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.classList.add('course-card');
        
        // Course content wrapper
        const courseContent = document.createElement('div');
        courseContent.classList.add('course-content');
        
        // Course title (h3 instead of h2 to match CSS)
        const courseTitle = document.createElement('h3');
        courseTitle.classList.add('course-title');
        courseTitle.textContent = course[`title_${currentLang}`] || course[`name_${currentLang}`] || '';
        courseContent.appendChild(courseTitle);
        
        // Course description
        if (course[`description_${currentLang}`]) {
            const courseDescription = document.createElement('p');
            courseDescription.classList.add('course-description');
            courseDescription.textContent = course[`description_${currentLang}`];
            courseContent.appendChild(courseDescription);
        }

        courseCard.appendChild(courseContent);

        // Edit mode: Show teacher management
        if (isEditMode) {
            const teachersContainer = document.createElement('div');
            teachersContainer.classList.add('course-teachers');

            // Show existing teachers with remove option
            if (course.teachers && course.teachers.length > 0) {
                course.teachers.forEach(teacher => {
                    const teacherAvatar = document.createElement('div');
                    teacherAvatar.classList.add('teacher-avatar');
                    
                    const teacherImg = document.createElement('img');
                    teacherImg.src = teacher.image_url || 'assets/default-profile.jpg';
                    teacherImg.alt = teacher[`name_${currentLang}`];
                    teacherImg.title = teacher[`name_${currentLang}`];
                    
                    // Add remove option if it's the current user
                    if (teacher.id === parseInt(currentMemberId)) {
                        const removeIcon = document.createElement('span');
                        removeIcon.textContent = '×';
                        removeIcon.classList.add('remove-teacher-icon');
                        removeIcon.addEventListener('click', async () => {
                            try {
                                const token = localStorage.getItem('sessionToken');
                                const memberId = getMemberIdFromUrl();
                                
                                if (!token) {
                                    throw new Error(
                                        getLangText({
                                            he: 'לא נמצא אסימון הזדהות. אנא התחבר מחדש.',
                                            en: 'No session token found. Please log in again.'
                                        }, currentLang)
                                    );
                                }

                                const response = await fetch(`${API_BASE_URL}/courses/${course.id}/teachers/${memberId}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.message || 
                                        getLangText({
                                            he: 'שגיאה בהסרת המורה',
                                            en: 'Failed to remove teacher'
                                        }, currentLang)
                                    );
                                }

                                // Remove the teacher from the local course data
                                course.teachers = course.teachers.filter(t => t.id !== parseInt(currentMemberId));
                                
                                // Re-render the courses
                                renderMemberCourses(coursesToRender);

                                alert(
                                    getLangText({
                                        he: 'מורה הוסר בהצלחה',
                                        en: 'Teacher removed successfully'
                                    }, currentLang)
                                );
                            } catch (error) {
                                console.error('Error removing teacher:', error);
                                alert(error.message);
                            }
                        });
                        teacherAvatar.appendChild(removeIcon);
                    }
                    
                    teacherAvatar.appendChild(teacherImg);
                    teachersContainer.appendChild(teacherAvatar);
                });
            }

            // Add "+" button to add teacher if not already a teacher
            const isCurrentUserTeacher = course.teachers?.some(
                relation => 
                    relation.id === parseInt(currentMemberId)
            );
            
            if (!isCurrentUserTeacher) {
                const addTeacherIcon = document.createElement('div');
                addTeacherIcon.classList.add('add-teacher-icon');
                addTeacherIcon.textContent = '+';
                addTeacherIcon.addEventListener('click', async () => {
                    try {
                        const token = localStorage.getItem('sessionToken');
                        const memberId = getMemberIdFromUrl();
                        
                        if (!token) {
                            throw new Error(
                                getLangText({
                                    he: 'לא נמצא אסימון הזדהות. אנא התחבר מחדש.',
                                    en: 'No session token found. Please log in again.'
                                }, currentLang)
                            );
                        }

                        const response = await fetch(`${API_BASE_URL}/courses/${course.id}/teachers`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ memberId })
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 
                                getLangText({
                                    he: 'שגיאה בהוספת המורה',
                                    en: 'Failed to add teacher'
                                }, currentLang)
                            );
                        }

                        // Add the teacher to the local course data
                        const memberData = await getMemberById(memberId);
                        if (!course.teachers) course.teachers = [];
                        course.teachers.push({
                            id: parseInt(memberId),
                            name_he: memberData.name_he,
                            name_en: memberData.name_en,
                            image_url: memberData.image_url
                        });
                        
                        // Re-render the courses
                        renderMemberCourses(coursesToRender);

                        alert(
                            getLangText({
                                he: 'מורה נוסף בהצלחה',
                                en: 'Teacher added successfully'
                            }, currentLang)
                        );
                    } catch (error) {
                        console.error('Error adding teacher:', error);
                        alert(error.message);
                    }
                });
                
                teachersContainer.appendChild(addTeacherIcon);
            }

            courseCard.appendChild(teachersContainer);
        } else {
            // Non-edit mode: Make entire card clickable
            courseCard.style.cursor = 'pointer';
            courseCard.addEventListener('click', () => {
                window.location.href = `https://avocadohead.github.io/Optopia-3.0/course-item.html?id=${course.id}`;
            });
        }
        
        coursesGrid.appendChild(courseCard);
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
