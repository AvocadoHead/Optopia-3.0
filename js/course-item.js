import { getCourseById } from './api-service.js';
import { getCurrentLang, setCurrentLang, handleError } from './utils.js';

let currentLang = getCurrentLang();

// Language toggle
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    updateLanguageDisplay();
    loadCourse();  // Reload with new language
};

function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        if (el.dataset.lang === currentLang) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

async function loadCourse() {
    try {
        currentLang = getCurrentLang();
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        if (!courseId) {
            throw new Error('No course ID provided');
        }

        const course = await getCourseById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        renderCourse(course);
    } catch (error) {
        console.error('Error loading course:', error);
        handleError(error);
    }
}

function renderCourse(course) {
    // Update title and description
    const courseTitle = document.getElementById('course-title');
    const courseDescription = document.getElementById('course-description');
    
    if (courseTitle) {
        courseTitle.textContent = currentLang === 'he' ? course.name_he : course.name_en;
    }
    
    if (courseDescription) {
        courseDescription.textContent = currentLang === 'he' ? course.description_he : course.description_en;
    }

    // Update subtopics if they exist
    const subtopicsList = document.getElementById('subtopics-list');
    if (subtopicsList && course.subtopics) {
        subtopicsList.innerHTML = course.subtopics
            .map(topic => `<li>${currentLang === 'he' ? topic.name_he : topic.name_en}</li>`)
            .join('');
    }

    // Update teachers
    const teachersContainer = document.getElementById('teachers-container');
    if (teachersContainer && course.teachers && course.teachers.length > 0) {
        teachersContainer.innerHTML = course.teachers.map(teacher => `
            <div class="teacher-card" onclick="window.location.href='member.html?id=${teacher.id}'">
                <div class="teacher-image">
                    <img src="${teacher.image_url || ''}" 
                         alt="${currentLang === 'he' ? teacher.name_he : teacher.name_en}"
                         onerror="this.src='assets/default-profile.jpg'">
                </div>
                <div class="teacher-info">
                    <h3>${currentLang === 'he' ? teacher.name_he : teacher.name_en}</h3>
                    <p>${currentLang === 'he' ? teacher.role_he : teacher.role_en}</p>
                </div>
            </div>
        `).join('');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateLanguageDisplay();
    loadCourse();
});
