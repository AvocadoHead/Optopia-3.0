import { getAllCourses } from './api-service.js';
import { getLangText, handleError, getCurrentLang } from './utils.js';

let courses = [];
let currentLang = getCurrentLang();  // Get current language

export async function loadCourses() {
    try {
        currentLang = getCurrentLang();  // Update language on load
        courses = await getAllCourses();
        renderCourses(courses);
    } catch (error) {
        console.error('Error loading courses:', error);
        handleError(error, 'Failed to load courses');
    }
}

export function renderCourses(coursesToRender) {
    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid) {
        console.error('Courses grid not found');
        return;
    }
    
    coursesGrid.innerHTML = '';

    coursesToRender.forEach(course => {
        const courseElement = createCourseElement(course);
        coursesGrid.appendChild(courseElement);
    });
}

function createCourseElement(course) {
    const courseDiv = document.createElement('div');
    courseDiv.className = 'course-card';
    courseDiv.onclick = () => window.location.href = `course-item.html?id=${course.id}`;

    const title = currentLang === 'he' ? course.name_he : course.name_en;
    const description = currentLang === 'he' ? course.description_he : course.description_en;

    courseDiv.innerHTML = `
        <div class="course-content">
            <h3>${title || ''}</h3>
            <p class="course-description">${description || ''}</p>
        </div>
        ${course.teachers && course.teachers.length > 0 ? `
            <div class="teachers-preview">
                ${course.teachers.map(teacher => {
                    if (!teacher) return '';
                    const teacherName = currentLang === 'he' ? teacher.name_he : teacher.name_en;
                    return `
                        <div class="teacher-avatar">
                            <img src="${teacher.image_url || 'assets/default-profile.jpg'}" 
                                 alt="${teacherName || ''}" 
                                 title="${teacherName || ''}"
                                 onerror="this.src='assets/default-profile.jpg'"
                                 style="border-radius: 50%; width: 40px; height: 40px;">
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
    `;

    return courseDiv;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCourses();
    } catch (error) {
        console.error('Error initializing courses page:', error);
        handleError(error, 'Failed to initialize courses page');
    }
});
