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
let isLoggedIn = localStorage.getItem('memberId') !== null;
let currentUserId = null;

// Global variable to track course teacher changes
let pendingCourseTeacherChanges = {
    addTeachers: [],
    removeTeachers: []
};

async function loadMemberData(memberId) {
    console.group('🔍 Member Data Loading');
    console.log('Loading data for Member ID:', memberId);

    try {
        // Fetch member data
        const memberData = await getMemberById(memberId);
        console.log('📋 Full Member Data:', JSON.stringify(memberData, null, 2));

        if (!memberData) {
            console.error('❌ No member data received');
            return;
        }

        // Fetch all courses
        const allCourses = await getAllCourses();
        console.log('📚 Full Courses Data:', JSON.stringify(allCourses, null, 2));

        // Filter gallery items for this member
        const galleryItems = memberData.gallery_items?.filter(item => 
            item.artist_id === memberId
        ) || [];
        console.log('🖼️ Gallery Items:', JSON.stringify(galleryItems, null, 2));

        // Filter courses where this member is a teacher
        const teachingCourses = filterCoursesForMember(allCourses, memberId, isEditMode);
        console.log('👩‍🏫 Teaching Courses:', JSON.stringify(teachingCourses, null, 2));

        // Store data for edit mode
        originalData = {
            memberDetails: memberData,
            galleryItems: galleryItems,
            teachingCourses: teachingCourses,
            allCourses: allCourses
        };

        currentData = { ...originalData };

        // Update page content
        updateMemberDetails(memberData);
        renderMemberGallery(galleryItems);
        renderMemberCourses(teachingCourses);

        console.groupEnd();
    } catch (error) {
        console.error('❌ Complete Loading Error:', error);
        console.groupEnd();
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
    // Ensure only logged-in users can toggle edit mode
    if (!isLoggedIn) {
        console.warn('Unauthorized: Cannot enter edit mode');
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
    }

    // Toggle visibility of save/discard buttons
    saveButton.style.display = isEditMode ? 'block' : 'none';
    discardButton.style.display = isEditMode ? 'block' : 'none';
    
    // Update edit button text
    if (currentLang === 'he') {
        editButton.querySelector('[data-lang="he"]').textContent = isEditMode ? 'ערוך פרופיל' : 'ערוך פרופיל';
    } else {
        editButton.querySelector('[data-lang="en"]').textContent = isEditMode ? 'Edit Profile' : 'Edit Profile';
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
        const memberId = getMemberIdFromUrl();
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            throw new Error('No session token found');
        }

        // Update member details
        await updateMember(memberId, currentData);
        originalData = { ...currentData };
        alert('Changes saved successfully!');
        
        // Handle course teacher changes
        if (pendingCourseTeacherChanges.removeTeachers.length > 0 || 
            pendingCourseTeacherChanges.addTeachers.length > 0) {
            
            // Remove teachers
            for (const courseId of pendingCourseTeacherChanges.removeTeachers) {
                await fetch(`/api/courses/${courseId}/teachers`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        teacherId: parseInt(currentUserId) 
                    })
                });
            }

            // Add teachers
            for (const courseId of pendingCourseTeacherChanges.addTeachers) {
                await fetch(`/api/courses/${courseId}/teachers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        teacherId: parseInt(currentUserId) 
                    })
                });
            }

            // Reset pending changes
            pendingCourseTeacherChanges = {
                addTeachers: [],
                removeTeachers: []
            };
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('Failed to save changes. Please try again.');
        // Revert changes on error
        currentData = { ...originalData };
        updateMemberDetails(originalData);
    }
}

function showAddGalleryItemForm(item, index) {
    // Check authentication and edit mode
    if (!isLoggedIn || !isEditMode) {
        console.warn('Unauthorized: Cannot add/edit gallery item');
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
                    <span data-lang="he">ביטול</span>
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
                ${isEditMode ? `
                    <button class="delete-gallery-item" data-index="${index}">
                        <span data-lang="he">×</span>
                        <span data-lang="en">×</span>
                    </button>
                ` : ''}
            </div>
            <div class="gallery-info">
                <h3>${title || ''}</h3>
                <p>${description || ''}</p>
            </div>
        `;
        
        // Add delete functionality if in edit mode
        if (isEditMode) {
            const deleteButton = card.querySelector('.delete-gallery-item');
            deleteButton.addEventListener('click', async () => {
                try {
                    // Get member ID from URL
                    const memberId = getMemberIdFromUrl();
                    
                    // Prepare authorization token
                    const token = localStorage.getItem('sessionToken');
                    if (!token) {
                        throw new Error('No session token found');
                    }

                    // Send request to backend to delete gallery item
                    const response = await fetch(`/api/members/${memberId}/gallery/${item.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to delete gallery item');
                    }

                    // Remove item from local state
                    currentData.galleryItems.splice(index, 1);
                    
                    // Re-render gallery
                    renderMemberGallery(currentData.galleryItems);
                } catch (error) {
                    console.error('Error deleting gallery item:', error);
                    alert(error.message || 'Failed to delete gallery item');
                }
            });
        }
        
        galleryGrid.appendChild(card);
    });

    console.log(`Rendered ${galleryGrid.children.length} gallery items`);
    console.groupEnd();
}

function renderMemberCourses(courses = []) {
    const coursesGrid = document.getElementById('member-courses-grid');
    coursesGrid.innerHTML = ''; // Clear previous content

    const currentLang = getCurrentLang();
    const memberId = getMemberIdFromUrl();
    const currentMemberId = localStorage.getItem('memberId');

    console.group('🔍 Rendering Member Courses Debug');
    console.log('Input Courses:', JSON.stringify(courses, null, 2));
    console.log('Member ID:', memberId);
    console.log('Current User ID:', currentMemberId);
    console.log('Is Logged In:', isLoggedIn);
    console.log('Is Edit Mode:', isEditMode);

    // Reset pending changes
    pendingCourseTeacherChanges = {
        addTeachers: [],
        removeTeachers: []
    };

    // Determine which courses to show
    let coursesToRender = filterCoursesForMember(courses, memberId, isEditMode);

    console.log('Courses to Render:', JSON.stringify(coursesToRender, null, 2));

    if (coursesToRender.length === 0) {
        console.warn('⚠️ No Courses to Render');
        coursesGrid.innerHTML = `
            <p class="no-courses-message">
                <span data-lang="he">אין קורסים</span>
                <span data-lang="en">No courses</span>
            </p>`;
    }

    coursesToRender.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.classList.add('course-card');
        
        // Course title
        const courseTitle = document.createElement('h3');
        courseTitle.textContent = course[`name_${currentLang}`];
        courseCard.appendChild(courseTitle);
        
        // Course teachers section
        const teachersContainer = document.createElement('div');
        teachersContainer.classList.add('course-teachers');
        
        // Render existing teachers only in edit mode or for logged-in users
        if ((isEditMode || isLoggedIn) && course.course_teachers) {
            course.course_teachers.forEach(relation => {
                const teacherAvatar = document.createElement('div');
                teacherAvatar.classList.add('teacher-avatar');
                
                const teacherImg = document.createElement('img');
                teacherImg.src = relation.teacher.image_url || 'assets/default-profile.jpg';
                teacherImg.alt = relation.teacher[`name_${currentLang}`];
                teacherImg.title = relation.teacher[`name_${currentLang}`];
                
                // In edit mode, add remove option for current user
                if (isEditMode && isLoggedIn && currentMemberId) {
                    const isCurrentUser = relation.teacher_id === parseInt(currentMemberId);
                    if (isCurrentUser) {
                        const removeIcon = document.createElement('span');
                        removeIcon.textContent = '×';
                        removeIcon.classList.add('remove-teacher-icon');
                        removeIcon.addEventListener('click', () => {
                            // Track removal of current user from course
                            if (!pendingCourseTeacherChanges.removeTeachers.includes(course.id)) {
                                pendingCourseTeacherChanges.removeTeachers.push(course.id);
                                // Optionally, remove from addTeachers if previously added
                                pendingCourseTeacherChanges.addTeachers = 
                                    pendingCourseTeacherChanges.addTeachers.filter(id => id !== course.id);
                            }
                            teacherAvatar.style.display = 'none';
                        });
                        teacherAvatar.appendChild(removeIcon);
                    }
                }
                
                teacherAvatar.appendChild(teacherImg);
                teachersContainer.appendChild(teacherAvatar);
            });
        }
        
        // In edit mode, add "+" for courses not taught by current user
        if (isEditMode && isLoggedIn && currentMemberId) {
            const isCurrentUserTeacher = course.course_teachers?.some(
                relation => relation.teacher_id === parseInt(currentMemberId)
            );
            
            if (!isCurrentUserTeacher) {
                const addTeacherIcon = document.createElement('div');
                addTeacherIcon.classList.add('add-teacher-icon');
                addTeacherIcon.textContent = '+';
                addTeacherIcon.addEventListener('click', () => {
                    // Track addition of current user to course
                    if (!pendingCourseTeacherChanges.addTeachers.includes(course.id)) {
                        pendingCourseTeacherChanges.addTeachers.push(course.id);
                        // Optionally, remove from removeTeachers if previously removed
                        pendingCourseTeacherChanges.removeTeachers = 
                            pendingCourseTeacherChanges.removeTeachers.filter(id => id !== course.id);
                    }
                    
                    // Create a temporary avatar for the current user
                    const currentUserAvatar = document.createElement('div');
                    currentUserAvatar.classList.add('teacher-avatar');
                    
                    const currentUserImg = document.createElement('img');
                    currentUserImg.src = localStorage.getItem('userImageUrl') || 'assets/default-profile.jpg';
                    currentUserImg.alt = localStorage.getItem('userName');
                    currentUserImg.title = localStorage.getItem('userName');
                    
                    currentUserAvatar.appendChild(currentUserImg);
                    teachersContainer.appendChild(currentUserAvatar);
                    
                    // Remove the "+" icon
                    addTeacherIcon.remove();
                });
                
                teachersContainer.appendChild(addTeacherIcon);
            }
        }
        
        courseCard.appendChild(teachersContainer);
        coursesGrid.appendChild(courseCard);
    });

    console.log(`Rendered ${coursesGrid.children.length} courses for member`);
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

function filterCoursesForMember(courses, memberId, isEditMode = false) {
    const memberIdNum = parseInt(memberId);
    
    // In edit mode, show all courses
    if (isEditMode) return courses;

    // In non-edit mode, show only courses taught by this member
    return courses.filter(course => 
        course.course_teachers?.some(relation => {
            const teacherId = relation.teacher_id;
            
            console.log('Course Teacher Relation:', {
                courseId: course.id,
                teacherId: teacherId,
                teacherIdType: typeof teacherId,
                memberId: memberIdNum,
                memberIdType: typeof memberIdNum,
                isMatch: teacherId === memberIdNum || teacherId == memberIdNum
            });
            
            return teacherId === memberIdNum || teacherId == memberIdNum;
        })
    );
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
