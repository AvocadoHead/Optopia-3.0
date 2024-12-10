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
        console.group('🔍 Member Data Loading');
        console.log('Loading data for Member ID:', memberId);
        
        // Diagnostic logging for input parameters
        console.log('Current Language:', currentLang);
        console.log('Session Token:', localStorage.getItem('sessionToken'));
        console.log('Current User ID:', localStorage.getItem('memberId'));

        // Fetch member data
        const memberData = await getMemberById(memberId);
        console.log('🏠 Raw Member Data:', JSON.stringify(memberData, null, 2));

        // Diagnostic checks
        if (!memberData) {
            console.error('❌ No member data received');
            return;
        }

        // Fetch all courses
        const allCourses = await getAllCourses();
        console.log('📚 All Courses:', JSON.stringify(allCourses, null, 2));

        // Detailed data validation
        console.group('📊 Data Validation');
        console.log('Gallery Items Count:', memberData.gallery_items?.length || 0);
        console.log('Course Teachers Count:', memberData.course_teachers?.length || 0);
        console.log('Member ID:', memberId);
        console.groupEnd();

        // Enhanced filtering with detailed logging
        const galleryItems = memberData.gallery_items?.filter(item => {
            const isMatch = item.artist_id === memberId;
            console.log(`Gallery Item ${item.id}: artist_id ${item.artist_id} === ${memberId} = ${isMatch}`);
            return isMatch;
        }) || [];

        const teachingRelationships = memberData.course_teachers?.filter(ct => {
            const isMatch = ct.teacher_id === memberId;
            console.log(`Course Teacher Relationship: teacher_id ${ct.teacher_id} === ${memberId} = ${isMatch}`);
            return isMatch;
        }) || [];

        // Check login state
        const sessionToken = localStorage.getItem('sessionToken');
        currentUserId = localStorage.getItem('memberId');
        isLoggedIn = sessionToken && currentUserId === memberId;
        
        // Comprehensive state setup
        originalData = {
            memberDetails: { ...memberData },
            allCourses: allCourses,
            galleryItems: galleryItems,
            teachingRelationships: teachingRelationships
        };

        currentData = { ...originalData };

        console.group('🔢 Processed Data');
        console.log('Gallery Items:', JSON.stringify(currentData.galleryItems, null, 2));
        console.log('Teaching Relationships:', JSON.stringify(currentData.teachingRelationships, null, 2));
        console.groupEnd();

        console.groupEnd(); // Close initial group

        // Initialize page content
        updateMemberDetails(currentData.memberDetails);
        renderMemberGallery(currentData.galleryItems);
        renderMemberCourses();

        // Setup edit mode
        setupEditMode(memberId);

    } catch (error) {
        console.error('❌ Complete Loading Error:', error);
    }
}

function setupEditMode(memberId) {
    console.group('🛠️ Edit Mode Setup');
    
    // Check if edit mode should be enabled
    const urlParams = new URLSearchParams(window.location.search);
    const shouldEnableEditMode = urlParams.get('edit') === 'true' && isLoggedIn;
    
    console.log('Edit Mode Parameters:', {
        urlEditParam: urlParams.get('edit'),
        isLoggedIn,
        shouldEnableEditMode
    });

    // Show/hide edit controls based on login state
    const editControls = document.querySelectorAll('.edit-controls');
    const addButtons = document.querySelectorAll('#add-gallery-item, #add-course');
    const editButton = document.getElementById('edit-button');

    // Reset all controls to hidden
    editControls.forEach(control => control.style.display = 'none');
    addButtons.forEach(button => button.style.display = 'none');
    
    if (isLoggedIn) {
        // Show edit button
        if (editButton) {
            editButton.style.display = 'block';
            editButton.addEventListener('click', toggleEditMode);
        }

        // Conditionally show edit controls and add buttons
        if (shouldEnableEditMode) {
            console.log('🔓 Automatically enabling edit mode');
            toggleEditMode();
        }
    }

    console.groupEnd();
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
    console.group('🖼️ Rendering Gallery');
    console.log('Gallery Items:', JSON.stringify(galleryItems, null, 2));
    console.log('Current Context:', {
        language: currentLang,
        editMode: isEditMode,
        loggedIn: isLoggedIn
    });

    const galleryGrid = document.getElementById('member-gallery-grid');
    if (!galleryGrid) {
        console.error('❌ Gallery Grid Not Found');
        console.groupEnd();
        return;
    }

    galleryGrid.innerHTML = '';

    if (galleryItems.length === 0) {
        console.warn('⚠️ No Gallery Items');
        galleryGrid.innerHTML = `
            <p class="no-items-message">
                <span data-lang="he">אין פריטים בגלריה</span>
                <span data-lang="en">No items in gallery</span>
            </p>`;
        console.groupEnd();
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
            </div>
            <div class="gallery-info">
                <h3>${title || ''}</h3>
                <p>${description || ''}</p>
            </div>
        `;
        
        galleryGrid.appendChild(card);
    });

    console.groupEnd();
}

function renderMemberCourses() {
    console.group('📖 Rendering Courses');
    console.log('Current Context:', {
        editMode: isEditMode,
        loggedIn: isLoggedIn,
        allCourses: currentData.allCourses.length,
        teachingRelationships: currentData.teachingRelationships.length
    });

    const coursesGrid = document.getElementById('member-courses-grid');
    if (!coursesGrid) {
        console.error('❌ Courses Grid Not Found');
        console.groupEnd();
        return;
    }

    coursesGrid.innerHTML = '';

    const teachingCourseIds = new Set(
        currentData.teachingRelationships.map(rel => rel.course_id)
    );

    const coursesToShow = isEditMode 
        ? currentData.allCourses 
        : currentData.allCourses.filter(course => teachingCourseIds.has(course.id));

    console.log('Courses to Show:', coursesToShow.length);

    if (coursesToShow.length === 0) {
        console.warn('⚠️ No Courses to Display');
        coursesGrid.innerHTML = `
            <p class="no-items-message">
                <span data-lang="he">אין קורסים להצגה</span>
                <span data-lang="en">No courses to display</span>
            </p>`;
        console.groupEnd();
        return;
    }

    coursesToShow.forEach(course => {
        const isTeaching = teachingCourseIds.has(course.id);
        
        const card = document.createElement('div');
        card.className = 'course-card';
        
        const title = currentLang === 'he' ? course.name_he : course.name_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;
        
        card.innerHTML = `
            <div class="course-content">
                <h3>${title || ''}</h3>
                <p>${description || ''}</p>
            </div>
        `;
        
        coursesGrid.appendChild(card);
    });

    console.groupEnd();
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
