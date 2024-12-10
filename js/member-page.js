import { getLangText, getCurrentLang, setCurrentLang } from './utils.js';
import { getMemberById, updateMember, getAllCourses } from './api-service.js';

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
let isLoggedIn = false;
let currentUserId = null;

async function loadMemberData(memberId) {
    try {
        console.log('1. Starting loadMemberData for memberId:', memberId);
        currentLang = getCurrentLang();
        
        // Fetch member data and their gallery items
        const memberData = await getMemberById(memberId);
        console.log('2. Raw Member Data:', memberData);
        
        if (!memberData) {
            console.error('No member data received');
            return;
        }

        // Fetch all courses (needed for both modes)
        const allCourses = await getAllCourses();
        console.log('3. All Courses:', allCourses);
        
        // Store original data for reverting changes
        originalData = {
            memberDetails: { ...memberData },
            galleryItems: memberData.gallery_items?.filter(item => item.artist_id === memberId) || [],
            teachingRelationships: memberData.course_teachers?.filter(ct => ct.teacher_id === memberId) || [],
            allCourses: allCourses
        };

        // Set current data
        currentData = {
            memberDetails: { ...memberData },
            allCourses: allCourses,
            galleryItems: memberData.gallery_items?.filter(item => item.artist_id === memberId) || [],
            teachingRelationships: memberData.course_teachers?.filter(ct => ct.teacher_id === memberId) || []
        };

        console.log('4. Processed Data:', {
            galleryItems: currentData.galleryItems.length,
            teachingRelationships: currentData.teachingRelationships.length,
            allCourses: currentData.allCourses.length
        });
        
        // Check login state
        const sessionToken = localStorage.getItem('sessionToken');
        currentUserId = localStorage.getItem('memberId');
        isLoggedIn = sessionToken && currentUserId === memberId;
        
        console.log('5. Authentication State:', {
            hasToken: !!sessionToken,
            currentUserId,
            memberId,
            isLoggedIn
        });

        // Initialize page content
        updateMemberDetails(currentData.memberDetails);
        renderMemberGallery(currentData.galleryItems);
        renderMemberCourses();

        // Setup edit mode if needed
        setupEditMode(memberId);
        
    } catch (error) {
        console.error('Error in loadMemberData:', error);
    }
}

function setupEditMode(memberId) {
    // Check if edit mode should be enabled
    const urlParams = new URLSearchParams(window.location.search);
    const shouldEnableEditMode = urlParams.get('edit') === 'true' && isLoggedIn;
    
    console.log('6. Edit Mode Setup:', {
        shouldEnableEditMode,
        isLoggedIn
    });

    // Show/hide edit controls based on login state
    const editControls = document.querySelectorAll('.edit-controls');
    editControls.forEach(control => {
        control.style.display = isLoggedIn ? 'block' : 'none';
    });

    // Setup edit button
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.style.display = isLoggedIn ? 'block' : 'none';
        editButton.addEventListener('click', toggleEditMode);
    }

    // Setup add buttons
    const addButtons = document.querySelectorAll('#add-gallery-item, #add-course');
    addButtons.forEach(button => {
        if (button) {
            button.style.display = isLoggedIn ? 'block' : 'none';
            // Add click handlers
            if (button.id === 'add-gallery-item') {
                button.addEventListener('click', () => showAddGalleryItemForm());
            } else if (button.id === 'add-course') {
                button.addEventListener('click', () => showAddCourseForm());
            }
        }
    });

    // Enable edit mode if requested and logged in
    if (shouldEnableEditMode) {
        console.log('7. Auto-enabling edit mode');
        toggleEditMode();
    }
}

function toggleEditMode() {
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
        renderMemberCourses();
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
            currentData.galleryItems[index] = newItem;
        } else {
            if (!currentData.galleryItems) {
                currentData.galleryItems = [];
            }
            currentData.galleryItems.push(newItem);
        }
        renderMemberGallery(currentData.galleryItems);
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
    if (currentData.galleryItems) {
        currentData.galleryItems.splice(index, 1);
        saveChanges();
        renderMemberGallery(currentData.galleryItems);
    }
}

function cancelChanges() {
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
        console.error('Gallery grid element not found');
        return;
    }

    console.log('Rendering Gallery:', {
        itemCount: galleryItems.length,
        isEditMode,
        isLoggedIn
    });

    galleryGrid.innerHTML = '';
    
    if (galleryItems.length === 0) {
        galleryGrid.innerHTML = `
            <p class="no-items-message">
                <span data-lang="he">אין פריטים בגלריה</span>
                <span data-lang="en" style="display:none;">No items in gallery</span>
            </p>`;
        return;
    }

    galleryItems.forEach((item, index) => {
        if (!item) return;
        
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const title = currentLang === 'he' ? item.title_he : item.title_en;
        const description = currentLang === 'he' ? item.description_he : item.description_en;
        
        card.innerHTML = `
            <div class="gallery-image">
                <img src="${item.image_url || 'placeholder.jpg'}" alt="${title || 'Gallery Item'}">
            </div>
            <div class="gallery-info">
                <h3>${title || ''}</h3>
                <p>${description || ''}</p>
            </div>
            ${isLoggedIn && isEditMode ? `
                <div class="edit-controls">
                    <button class="edit-item-btn nav-btn">
                        <span data-lang="he">ערוך</span>
                        <span data-lang="en" style="display:none;">Edit</span>
                    </button>
                    <button class="delete-item-btn nav-btn">
                        <span data-lang="he">מחק</span>
                        <span data-lang="en" style="display:none;">Delete</span>
                    </button>
                </div>
            ` : ''}
        `;

        // Add event listeners for edit/delete buttons
        if (isLoggedIn && isEditMode) {
            const editBtn = card.querySelector('.edit-item-btn');
            const deleteBtn = card.querySelector('.delete-item-btn');
            
            editBtn?.addEventListener('click', () => showAddGalleryItemForm(item, index));
            deleteBtn?.addEventListener('click', () => deleteGalleryItem(index));
        }
        
        galleryGrid.appendChild(card);
    });
}

function renderMemberCourses() {
    const coursesGrid = document.getElementById('member-courses-grid');
    if (!coursesGrid) {
        console.error('Courses grid element not found');
        return;
    }

    console.log('Rendering Courses:', {
        mode: isEditMode ? 'edit' : 'view',
        teachingCount: currentData.teachingRelationships.length,
        totalCourses: currentData.allCourses.length
    });

    coursesGrid.innerHTML = '';
    
    // Determine which courses to display based on mode
    const coursesToShow = isEditMode ? 
        currentData.allCourses : 
        currentData.allCourses.filter(course => 
            currentData.teachingRelationships.some(rel => rel.course_id === course.id)
        );

    if (coursesToShow.length === 0) {
        coursesGrid.innerHTML = `
            <p class="no-items-message">
                <span data-lang="he">אין קורסים להצגה</span>
                <span data-lang="en" style="display:none;">No courses to display</span>
            </p>`;
        return;
    }

    // Create Set of teaching course IDs for quick lookup
    const teachingCourseIds = new Set(
        currentData.teachingRelationships.map(rel => rel.course_id)
    );

    coursesToShow.forEach(course => {
        const isTeaching = teachingCourseIds.has(course.id);
        renderCourseCard(coursesGrid, course, isTeaching);
    });
}

function renderCourseCard(container, course, isTeaching) {
    if (!course) return;

    const card = document.createElement('div');
    card.className = 'course-card';
    card.dataset.courseId = course.id;
    
    const title = currentLang === 'he' ? course.name_he : course.name_en;
    const description = currentLang === 'he' ? course.description_he : course.description_en;
    const difficulty = currentLang === 'he' ? course.difficulty_he : course.difficulty_en;
    const duration = currentLang === 'he' ? course.duration_he : course.duration_en;
    
    card.innerHTML = `
        <div class="course-content">
            <h3>${title || ''}</h3>
            <p>${description || ''}</p>
            <div class="course-details">
                <span class="difficulty">${difficulty || ''}</span>
                <span class="duration">${duration || ''}</span>
            </div>
        </div>
        ${isLoggedIn && isEditMode ? `
            <div class="course-actions">
                <button class="toggle-teaching-btn nav-btn ${isTeaching ? 'teaching' : ''}">
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

    // Add event listeners
    if (isLoggedIn && isEditMode) {
        const toggleBtn = card.querySelector('.toggle-teaching-btn');
        toggleBtn?.addEventListener('click', () => toggleTeachingStatus(course.id, !isTeaching));
    }

    // Add click handler for course details
    const courseContent = card.querySelector('.course-content');
    courseContent?.addEventListener('click', () => {
        window.location.href = `course-item.html?id=${course.id}`;
    });
    
    container.appendChild(card);
}

async function toggleTeachingStatus(courseId, shouldTeach) {
    try {
        if (shouldTeach) {
            // Add teaching relationship
            currentData.teachingRelationships.push({
                course_id: courseId,
                teacher_id: currentUserId
            });
        } else {
            // Remove teaching relationship
            currentData.teachingRelationships = currentData.teachingRelationships.filter(
                rel => rel.course_id !== courseId
            );
        }
        
        // Update the display
        renderMemberCourses();
        
        // Save changes if not in edit mode
        if (!isEditMode) {
            await saveChanges();
        }
    } catch (error) {
        console.error('Error toggling teaching status:', error);
        alert('Failed to update teaching status. Please try again.');
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
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const editMode = urlParams.get('edit') === 'true';
    
    console.log('Initialization Parameters:', {
        memberId, 
        editMode, 
        isLoggedIn, 
        currentUserId: localStorage.getItem('memberId')
    });
    
    if (memberId) {
        await loadMemberData(memberId);
        
        // Explicitly set edit mode if requested
        if (editMode && isLoggedIn) {
            console.log('Attempting to enable edit mode');
            toggleEditMode();
        }
        
        updateLanguageDisplay();
    }
});
