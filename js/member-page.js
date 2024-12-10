import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { getMemberById, updateMember, API_BASE_URL } from './api-service.js';

// Global state
let currentLang = getCurrentLang();
let isEditMode = false;
let originalData = null;
let currentData = null;
let isLoggedIn = false;
let currentUserId = null;

async function loadMemberData(memberId) {
    try {
        currentLang = getCurrentLang();
        const memberData = await getMemberById(memberId);
        if (memberData) {
            originalData = { ...memberData };
            currentData = { ...memberData };
            
            // Check login state
            const sessionToken = localStorage.getItem('sessionToken');
            currentUserId = localStorage.getItem('memberId');
            isLoggedIn = sessionToken && currentUserId === memberId;
            
            // Initialize page
            updateMemberDetails(memberData);
            renderMemberGallery(memberData.gallery_items || []);
            renderMemberCourses(memberData.courses || []);
            
            // Show edit controls only if logged in as this member
            const editControls = document.querySelectorAll('.edit-controls');
            editControls.forEach(control => {
                control.style.display = isLoggedIn ? 'block' : 'none';
            });
            
            // Show edit button only if logged in as this member
            const editButton = document.getElementById('edit-button');
            if (editButton) {
                editButton.style.display = isLoggedIn ? 'block' : 'none';
                editButton.addEventListener('click', toggleEditMode);
            }

            // Show add buttons only if logged in as this member
            const addButtons = document.querySelectorAll('#add-gallery-item, #add-course');
            addButtons.forEach(button => {
                if (button) button.style.display = isLoggedIn ? 'block' : 'none';
            });

            // Set up event listeners
            const addGalleryBtn = document.getElementById('add-gallery-item');
            const addCourseBtn = document.getElementById('add-course');
            if (addGalleryBtn) {
                addGalleryBtn.addEventListener('click', showAddGalleryItemForm);
            }
            if (addCourseBtn) {
                addCourseBtn.addEventListener('click', showAddCourseForm);
            }
        }
    } catch (error) {
        console.error('Error loading member data:', error);
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);

    // Show/hide add buttons based on edit mode
    const addButtons = document.querySelectorAll('#add-gallery-item, #add-course');
    addButtons.forEach(button => {
        if (button) button.style.display = isEditMode ? 'block' : 'none';
    });

    // Toggle edit button text
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        const heSpan = editButton.querySelector('[data-lang="he"]');
        const enSpan = editButton.querySelector('[data-lang="en"]');
        if (isEditMode) {
            heSpan.textContent = 'צא ממצב עריכה';
            enSpan.textContent = 'Exit Edit Mode';

            // Create edit controls
            const editControls = document.createElement('div');
            editControls.className = 'edit-controls';
            editControls.style.display = 'block';
            editControls.innerHTML = `
                <button id="save-changes" class="nav-btn">
                    <span data-lang="he">שמור שינויים</span>
                    <span data-lang="en" style="display:none;">Save Changes</span>
                </button>
                <button id="cancel-changes" class="nav-btn">
                    <span data-lang="he">בטל שינויים</span>
                    <span data-lang="en" style="display:none;">Cancel Changes</span>
                </button>
            `;
            
            // Add event listeners to the new buttons
            const saveBtn = editControls.querySelector('#save-changes');
            const cancelBtn = editControls.querySelector('#cancel-changes');
            saveBtn.addEventListener('click', saveChanges);
            cancelBtn.addEventListener('click', cancelChanges);

            // Add the controls to the page
            const memberProfile = document.querySelector('.member-profile');
            memberProfile.appendChild(editControls);

            // Create password change button
            const changePasswordBtn = document.createElement('button');
            changePasswordBtn.id = 'change-password-button';
            changePasswordBtn.className = 'nav-btn';
            changePasswordBtn.innerHTML = `
                <span data-lang="he">שנה סיסמה</span>
                <span data-lang="en" style="display:none;">Change Password</span>
            `;
            changePasswordBtn.addEventListener('click', showChangePasswordDialog);
            editControls.appendChild(changePasswordBtn);
        } else {
            heSpan.textContent = 'ערוך פרופיל';
            enSpan.textContent = 'Edit Profile';

            // Remove edit controls (which includes password change button)
            const editControls = document.querySelector('.edit-controls');
            if (editControls) {
                editControls.remove();
            }
        }
    }

    // Make fields editable
    const editableFields = document.querySelectorAll('.editable');
    editableFields.forEach(field => {
        field.contentEditable = isEditMode;
        if (isEditMode) {
            field.addEventListener('input', handleFieldEdit);
        } else {
            field.removeEventListener('input', handleFieldEdit);
        }
    });

    // Reset to original data if canceling edit mode
    if (!isEditMode) {
        currentData = { ...originalData };
        updateMemberDetails(currentData);
        renderMemberGallery(currentData.gallery_items || []);
        renderMemberCourses(currentData.courses || []);
    }
}

function showChangePasswordDialog() {
    const dialog = document.createElement('dialog');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <h3>
            <span data-lang="he">שינוי סיסמה</span>
            <span data-lang="en" style="display:none;">Change Password</span>
        </h3>
        <form id="change-password-form" class="change-password-form">
            <div class="form-group">
                <label for="current-password">
                    <span data-lang="he">סיסמה נוכחית</span>
                    <span data-lang="en" style="display:none;">Current Password</span>
                </label>
                <input type="password" id="current-password" required>
            </div>
            <div class="form-group">
                <label for="new-password">
                    <span data-lang="he">סיסמה חדשה</span>
                    <span data-lang="en" style="display:none;">New Password</span>
                </label>
                <input type="password" id="new-password" required>
            </div>
            <div class="form-group">
                <label for="confirm-password">
                    <span data-lang="he">אימות סיסמה חדשה</span>
                    <span data-lang="en" style="display:none;">Confirm New Password</span>
                </label>
                <input type="password" id="confirm-password" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <span data-lang="he">עדכן סיסמה</span>
                    <span data-lang="en" style="display:none;">Update Password</span>
                </button>
                <button type="button" class="btn" onclick="this.closest('dialog').close()">
                    <span data-lang="he">ביטול</span>
                    <span data-lang="en" style="display:none;">Cancel</span>
                </button>
            </div>
        </form>
    `;

    // Add to document and show
    document.body.appendChild(dialog);
    dialog.showModal();

    // Handle form submission
    const form = dialog.querySelector('#change-password-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handlePasswordChange(event);
        dialog.close();
    });

    // Update language display
    updateLanguageDisplay();
}

async function handlePasswordChange(event) {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to change password');
        }

        alert('Password changed successfully');
    } catch (error) {
        console.error('Error changing password:', error);
        alert(error.message);
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
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            throw new Error('No session token found');
        }

        // Update member details
        await updateMember(memberId, currentData);
        originalData = { ...currentData };
        alert('Changes saved successfully!');
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('Failed to save changes. Please try again.');
        // Revert changes on error
        currentData = { ...originalData };
        updateMemberDetails(originalData);
    }
}

function showAddGalleryItemForm(item, index) {
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
                    <span data-lang="he">ביטול</span>
                    <span data-lang="en" style="display:none;">Cancel</span>
                </button>
            </div>
        </form>
    `;
    
    dialog.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newItem = {
            title_he: formData.get('title_he'),
            title_en: formData.get('title_en'),
            description_he: formData.get('description_he'),
            description_en: formData.get('description_en'),
            image_url: formData.get('image_url')
        };
        
        if (item) {
            currentData.gallery_items[index] = newItem;
        } else {
            if (!currentData.gallery_items) {
                currentData.gallery_items = [];
            }
            currentData.gallery_items.push(newItem);
        }
        renderMemberGallery(currentData.gallery_items);
        dialog.close();
    });
    
    document.body.appendChild(dialog);
    dialog.showModal();
    updateLanguageDisplay();
}

function showAddCourseForm(course, index) {
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

async function deleteGalleryItem(index) {
    try {
        if (!currentData.gallery_items) return;
        
        const item = currentData.gallery_items[index];
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        
        const response = await fetch(`${API_BASE_URL}/gallery/${item.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete gallery item');
        }

        // Update local state
        currentData.gallery_items.splice(index, 1);
        renderMemberGallery(currentData.gallery_items);
        alert('Gallery item deleted successfully!');
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        alert('Failed to delete gallery item. Please try again.');
    }
}

async function addToCourse(courseId) {
    try {
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ memberId })
        });

        if (!response.ok) {
            throw new Error('Failed to add teacher to course');
        }

        // Update local state
        if (!currentData.courses) currentData.courses = [];
        const courseData = await response.json();
        currentData.courses.push(courseData);
        renderMemberCourses(currentData.courses);
        alert('Successfully added to course!');
    } catch (error) {
        console.error('Error adding to course:', error);
        alert('Failed to add to course. Please try again.');
    }
}

function cancelChanges() {
    currentData = { ...originalData };
    updateMemberDetails(originalData);
    renderMemberGallery(originalData.gallery_items || []);
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
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '';
    
    galleryItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;
        const description = currentLang === 'he' ? item.description_he : item.description_en;
        
        // Make the card clickable except for edit controls
        card.innerHTML = `
            <a href="gallery-item.html?id=${item.id}" class="gallery-link">
                <div class="gallery-image">
                    <img src="${item.image_url}" alt="${title}">
                </div>
                <div class="gallery-info">
                    <h3>${title}</h3>
                    <p>${description}</p>
                </div>
            </a>
            ${isLoggedIn && isEditMode ? `
                <div class="edit-controls">
                    <button onclick="editGalleryItem(${index})" class="nav-btn">
                        <span data-lang="he">ערוך</span>
                        <span data-lang="en" style="display:none;">Edit</span>
                    </button>
                    <button onclick="deleteGalleryItem(${index})" class="nav-btn">
                        <span data-lang="he">מחק</span>
                        <span data-lang="en" style="display:none;">Delete</span>
                    </button>
                </div>
            ` : ''}
        `;
        
        galleryGrid.appendChild(card);
    });
}

function renderMemberCourses(courses = []) {
    const coursesGrid = document.getElementById('member-courses-grid');
    if (!coursesGrid) return;

    coursesGrid.innerHTML = '';
    
    // If in edit mode and logged in, show all available courses
    if (isEditMode && isLoggedIn && currentData.all_courses) {
        const allCourses = currentData.all_courses;
        const teachingCourseIds = new Set((currentData.courses || []).map(c => c.id));
        
        allCourses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            const isTeaching = teachingCourseIds.has(course.id);
            
            const title = currentLang === 'he' ? course.name_he : course.name_en;
            const description = currentLang === 'he' ? course.description_he : course.description_en;
            const difficulty = currentLang === 'he' ? course.difficulty_he : course.difficulty_en;
            const duration = currentLang === 'he' ? course.duration_he : course.duration_en;
            
            courseCard.innerHTML = `
                <a href="course-item.html?id=${course.id}" class="course-link">
                    <h3>${title || ''}</h3>
                    <p>${description || ''}</p>
                    <div class="course-details">
                        <span class="difficulty">${difficulty || ''}</span>
                        <span class="duration">${duration || ''}</span>
                    </div>
                </a>
                ${isLoggedIn ? `
                    <div class="course-actions">
                        <button onclick="${isTeaching ? 'removeFromCourse' : 'addToCourse'}(${course.id})" class="nav-btn ${isTeaching ? 'teaching' : ''}">
                            ${isTeaching ? `
                                <span data-lang="he">מלמד/ת קורס זה</span>
                                <span data-lang="en" style="display:none;">Teaching this course</span>
                            ` : `
                                <span data-lang="he">הצטרף/י כמורה</span>
                                <span data-lang="en" style="display:none;">Join as teacher</span>
                            `}
                        </button>
                    </div>
                ` : ''}
            `;
            
            coursesGrid.appendChild(courseCard);
        });
    } else {
        // Show only teaching courses in non-edit mode
        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            
            const title = currentLang === 'he' ? course.name_he : course.name_en;
            const description = currentLang === 'he' ? course.description_he : course.description_en;
            const difficulty = currentLang === 'he' ? course.difficulty_he : course.difficulty_en;
            const duration = currentLang === 'he' ? course.duration_he : course.duration_en;
            
            courseCard.innerHTML = `
                <a href="course-item.html?id=${course.id}" class="course-link">
                    <h3>${title || ''}</h3>
                    <p>${description || ''}</p>
                    <div class="course-details">
                        <span class="difficulty">${difficulty || ''}</span>
                        <span class="duration">${duration || ''}</span>
                    </div>
                </a>
            `;
            
            coursesGrid.appendChild(courseCard);
        });
    }
}

window.addToCourse = async function(courseId) {
    try {
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ memberId })
        });

        if (!response.ok) {
            throw new Error('Failed to add teacher to course');
        }

        // Update local state
        if (!currentData.courses) currentData.courses = [];
        const courseData = await response.json();
        currentData.courses.push(courseData);
        renderMemberCourses(currentData.courses);
        alert('Successfully added to course!');
    } catch (error) {
        console.error('Error adding to course:', error);
        alert('Failed to add to course. Please try again.');
    }
};

window.removeFromCourse = async function(courseId) {
    try {
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/teachers`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove teacher from course');
        }

        // Update local state
        currentData.courses = currentData.courses.filter(c => c.id !== courseId);
        renderMemberCourses(currentData.courses);
        alert('Successfully removed from course!');
    } catch (error) {
        console.error('Error removing from course:', error);
        alert('Failed to remove from course. Please try again.');
    }
};

window.editGalleryItem = function(index) {
    const item = currentData.gallery_items[index];
    showAddGalleryItemForm(item, index);
};

window.deleteGalleryItem = function(index) {
    if (confirm(currentLang === 'he' ? 'האם אתה בטוח שברצונך למחוק פריט זה?' : 'Are you sure you want to delete this item?')) {
        deleteGalleryItem(index);
    }
};

window.editCourse = function(index) {
    const course = currentData.courses[index];
    showAddCourseForm(course, index);
};

window.deleteCourse = function(index) {
    if (confirm(currentLang === 'he' ? 'האם אתה בטוח שברצונך למחוק קורס זה?' : 'Are you sure you want to delete this course?')) {
        currentData.courses.splice(index, 1);
        renderMemberCourses(currentData.courses);
    }
};

// Check if user is logged in and has permission to edit
function canEditProfile(memberId) {
    const sessionToken = localStorage.getItem('sessionToken');
    const loggedInMemberId = localStorage.getItem('memberId');
    return sessionToken && loggedInMemberId === memberId;
}

// Show or hide edit button based on permissions
function updateEditButtonVisibility(memberId) {
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.style.display = canEditProfile(memberId) ? 'block' : 'none';
    }
}

// Initialize member page
async function initMemberPage() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('id');
        const editMode = urlParams.get('edit') === 'true';

        if (!memberId) {
            throw new Error('Member ID is required');
        }

        // Update edit button visibility
        updateEditButtonVisibility(memberId);

        // If in edit mode and has permission, show edit form
        if (editMode && canEditProfile(memberId)) {
            toggleEditMode();
        }

        // Load member data
        await loadMemberData(memberId);
    } catch (error) {
        console.error('Error initializing member page:', error);
        alert(error.message);
    }
}

// Language toggle functionality
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    updateLanguageDisplay();
    
    // Re-render content with new language
    const memberId = getMemberIdFromUrl();
    if (memberId) {
        updateMemberDetails(currentData);
        renderMemberGallery(currentData.gallery_items);
        renderMemberCourses(currentData.courses);
    }
};

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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initMemberPage();
});
