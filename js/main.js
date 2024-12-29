// Import necessary modules and functions
import { 
    getAllCourses, 
    getAllGalleryItems, 
    getAllMembers, 
    getMemberById, 
    loginUser, 
    logoutUser 
} from './api-service.js';

import { 
    handleError, 
    getLangText, 
    getCurrentLang, 
    setCurrentLang, 
    getMemberIdFromUrl 
} from './utils.js';

// Global state
let currentLang = getCurrentLang() || 'he'; // Default to Hebrew
let dataInitialized = false;
let galleryData = [];
let coursesData = [];
let membersData = [];

// Language toggle functionality
function toggleLanguage() {
    const prevLang = currentLang;
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';

    console.log(`Language toggled: ${prevLang} → ${currentLang}`);

    // Update UI to reflect the new language
    updateLanguageDisplay();

    // Re-render page-specific dynamic content
    initializePage();
}

// Update visible elements based on the selected language
function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = el.dataset.lang === currentLang ? '' : 'none';
    });
}

// Initialize language toggle button
function initLanguageToggle() {
    const toggleBtn = document.getElementById('toggle-language');
    if (toggleBtn) {
        toggleBtn.onclick = toggleLanguage;
        toggleBtn.textContent = currentLang === 'he' ? 'EN' : 'HE';
    }
    updateLanguageDisplay();
}

// Load gallery items from the API
async function loadGalleryItems() {
    try {
        galleryData = await getAllGalleryItems();
        return galleryData;
    } catch (error) {
        console.error('Error loading gallery items:', error.message);
        return [];
    }
}

// Load courses from the API
async function loadCourses() {
    try {
        coursesData = await getAllCourses();
        return coursesData;
    } catch (error) {
        console.error('Error loading courses:', error.message);
        return [];
    }
}

// Load members from the API
async function loadMembers() {
    try {
        membersData = await getAllMembers();
        return membersData;
    } catch (error) {
        console.error('Error loading members:', error.message);
        return [];
    }
}

// Initialize app data
async function initializeAppData() {
    if (dataInitialized) return;

    try {
        const [galleryItems, courses, members] = await Promise.all([
            loadGalleryItems(),
            loadCourses(),
            loadMembers()
        ]);

        galleryData = galleryItems;
        coursesData = courses;
        membersData = members;

        dataInitialized = true;
    } catch (error) {
        console.error('Error initializing app data:', error.message);
        throw error;
    }
}

// Render functions for gallery, courses, and members
function renderGalleryPreview(container, count = 6) {
    if (!container || galleryData.length === 0) return;

    container.innerHTML = '';
    const itemsToShow = galleryData.slice(0, count);
    itemsToShow.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            <img src="${item.image_url || 'assets/default-gallery.jpg'}" alt="${getLangText(item.title, currentLang)}">
            <div class="gallery-info">
                <h3>${getLangText(item.title, currentLang)}</h3>
                <p>${getLangText(item.description, currentLang)}</p>
            </div>
        `;
        card.onclick = () => window.location.href = `gallery-item.html?id=${item.id}`;
        container.appendChild(card);
    });
}

function renderCoursesPreview(container, count = 6) {
    if (!container || coursesData.length === 0) return;

    container.innerHTML = '';
    const coursesToShow = coursesData.slice(0, count);
    coursesToShow.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <h3>${getLangText(course.title, currentLang)}</h3>
            <p>${getLangText(course.description, currentLang)}</p>
        `;
        card.onclick = () => window.location.href = `course-item.html?id=${course.id}`;
        container.appendChild(card);
    });
}

function renderMembers(container, limit = null) {
    if (!container || membersData.length === 0) return;

    container.innerHTML = '';
    const membersToShow = limit ? membersData.slice(0, limit) : membersData;

    membersToShow.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <img src="${member.image_url || 'assets/default-profile.jpg'}" alt="${getLangText(member.name, currentLang)}">
            <h3>${getLangText(member.name, currentLang)}</h3>
        `;
        card.onclick = () => window.location.href = `member.html?id=${member.id}`;
        container.appendChild(card);
    });
}

// Initialize home page
async function initHomePage() {
    console.log('Initializing home page');
    if (!dataInitialized) await initializeAppData();

    const galleryPreview = document.getElementById('gallery-preview');
    const coursesPreview = document.getElementById('courses-preview');
    const membersGrid = document.getElementById('members-grid');

    if (galleryPreview) renderGalleryPreview(galleryPreview, 6);
    if (coursesPreview) renderCoursesPreview(coursesPreview, 6);
    if (membersGrid) renderMembers(membersGrid, 15);
}

// Page router
async function initializePage() {
    const path = window.location.pathname;

    try {
        await initializeAppData();

        if (path.includes('index.html') || path === '/') {
            await initHomePage();
        } else if (path.includes('gallery.html')) {
            console.log('Initialize gallery page...');
        } else if (path.includes('courses.html')) {
            console.log('Initialize courses page...');
        } else if (path.includes('member.html')) {
            console.log('Initialize member page...');
        }
    } catch (error) {
        console.error('Error initializing page:', error.message);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        initLanguageToggle();
        await initializePage();
    } catch (error) {
        console.error('Error during initialization:', error.message);
    }
});
