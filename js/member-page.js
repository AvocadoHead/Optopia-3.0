import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { getMemberById, updateMember } from './api-service.js';

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
            
            // Fetch courses taught by the member
            const coursesTaught = memberData.course_teachers.map(ct => ct.course);
            console.log('Courses taught by member:', coursesTaught);

            // Initialize page
            updateMemberDetails(memberData);
            renderMemberGallery(memberData.gallery_items || []);
            renderMemberCourses(coursesTaught);

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
    const editButton = document.getElementById('edit-button');
    if (!editButton) return;

    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);
    
    // Update button text
    if (currentLang === 'he') {
        editButton.querySelector('[data-lang="he"]').textContent = isEditMode ? 'שמור שינויים' : 'ערוך פרופיל';
    } else {
        editButton.querySelector('[data-lang="en"]').textContent = isEditMode ? 'Save Changes' : 'Edit Profile';
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
        renderMemberCourses(currentData.courses || []);
    } else {
        // Save changes
        saveChanges();
        
        // Make fields non-editable
        const editables = document.querySelectorAll('.editable');
        editables.forEach(field => {
            field.contentEditable = false;
            field.removeEventListener('blur', handleFieldEdit);
        });

        // Re-render courses to show only teaching ones
        renderMemberCourses(currentData.courses || []);
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

function addToCourse(courseId) {
    if (!currentData.courses) {
        currentData.courses = [];
    }
    if (!currentData.courses.includes(courseId)) {
        currentData.courses.push(courseId);
        saveChanges();
        renderMemberCourses(currentData.courses);
    }
}

function deleteGalleryItem(index) {
    if (currentData.gallery_items) {
        currentData.gallery_items.splice(index, 1);
        saveChanges();
        renderMemberGallery(currentData.gallery_items);
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
        const teachingCourseIds = new Set((currentData.course_teachers || []).map(ct => ct.course_id));
        
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
        const teachingCourses = currentData.course_teachers || [];
        
        teachingCourses.forEach(course => {
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
    const memberId = getMemberIdFromUrl();
    if (memberId) {
        await loadMemberData(memberId);
        updateLanguageDisplay();
    }
});
