// Optopia Core Functionality
import { getAllCourses, getAllGalleryItems, getAllMembers, getMemberById, updateMember, login, logout } from './api-service.js';
import { handleError, getLangText, getCurrentLang, setCurrentLang, getMemberIdFromUrl } from './utils.js';

// Global state
let currentLang = getCurrentLang();
let dataInitialized = false;
let galleryData = [];
let coursesData = [];
let membersData = [];

// Language toggle functionality
function toggleLanguage() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    updateLanguageDisplay();
    
    // Re-render dynamic content based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Toggling language on page:', currentPage);
    
    switch (currentPage) {
        case 'index.html':
        case '':
            const membersGrid = document.getElementById('members-grid');
            const galleryPreview = document.getElementById('gallery-preview');
            const coursesPreview = document.getElementById('courses-preview');
            
            if (membersGrid) {
                renderMembers(membersGrid, 15);
            }
            if (galleryPreview) {
                renderGalleryPreview(galleryPreview, 6);
            }
            if (coursesPreview) {
                renderCoursesPreview(coursesPreview, 6);
            }
            break;
            
        case 'gallery.html':
            console.log('Re-rendering gallery page');
            const galleryGrid = document.getElementById('gallery-grid');
            if (galleryGrid) {
                renderGalleryPage();
            }
            break;
            
        case 'courses.html':
            console.log('Re-rendering courses page');
            const coursesGrid = document.getElementById('courses-grid');
            if (coursesGrid) {
                renderCoursesPage();
            }
            
            // Update search placeholder
            const searchInput = document.getElementById('courses-search-input');
            if (searchInput) {
                searchInput.placeholder = currentLang === 'he' ? 
                    'חפש קורסים, מרצים או נושאים' : 
                    'Search courses, teachers, or topics';
            }
            break;
            
        case 'member.html':
            console.log('Re-rendering member page');
            initMemberPage();
            break;
            
        case 'gallery-item.html':
            console.log('Re-rendering gallery item page');
            initGalleryItemPage();
            break;
            
        case 'course-item.html':
            console.log('Re-rendering course item page');
            initCourseItemPage();
            break;
    }
}

function updateLanguageDisplay() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = el.dataset.lang === currentLang ? '' : 'none';
    });
}

function initLanguageToggle() {
    const toggleBtn = document.querySelector('button[onclick="toggleLanguage()"]');
    if (toggleBtn) {
        toggleBtn.onclick = toggleLanguage;
    }
    updateLanguageDisplay();
}

// Toggle members display
function toggleMembers() {
    const membersContainer = document.getElementById('members-grid');
    const toggleBtn = document.getElementById('toggle-members');
    
    if (!membersContainer || !toggleBtn) return;
    
    window.membersExpanded = !window.membersExpanded;
    renderMembers(membersContainer, 15);
    
    toggleBtn.textContent = window.membersExpanded ? 
        getLangText({ he: 'הצג פחות', en: 'Show Less' }, currentLang) : 
        getLangText({ he: 'הצג עוד', en: 'Show More' }, currentLang);
}

// Data initialization
async function loadGalleryItems() {
    try {
        console.log('Fetching gallery items...');
        const items = await getAllGalleryItems();
        console.log('Raw gallery data:', items);
        if (items && Array.isArray(items)) {
            galleryData = items;
            return items;
        }
        return [];
    } catch (error) {
        console.error('Error loading gallery items:', error);
        galleryData = [];
        return [];
    }
}

async function loadCourses() {
    try {
        console.log('Loading courses...');
        const courses = await getAllCourses();
        console.log('Loaded courses:', courses);
        if (courses && Array.isArray(courses)) {
            coursesData = courses;
            console.log('Updated coursesData:', coursesData);
            return courses;
        } else {
            console.error('Invalid courses data received:', courses);
            return [];
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesData = [];
        return [];
    }
}

async function loadMembers() {
    try {
        console.log('Fetching members...');
        const members = await getAllMembers();
        console.log('Raw members data:', members);
        if (members && Array.isArray(members)) {
            membersData = members;
            return members;
        }
        return [];
    } catch (error) {
        console.error('Error loading members:', error);
        membersData = [];
        return [];
    }
}

async function initializeAppData() {
    if (dataInitialized) return;
    
    try {
        // Fetch all data in parallel
        const [galleryItems, courses, members] = await Promise.all([
            loadGalleryItems(),
            loadCourses(),
            loadMembers()
        ]);
        
        // Store the data
        galleryData = galleryItems;
        coursesData = courses;
        membersData = members;
        
        console.log('Data loaded successfully:', {
            gallery: galleryData.length,
            courses: coursesData.length,
            members: membersData.length
        });
        
        dataInitialized = true;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Rendering functions
function renderGalleryItem(item, container) {
    if (!item || !container) return;
    
    const card = document.createElement('div');
    card.className = 'gallery-card';
    
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'gallery-image';
    
    const img = document.createElement('img');
    const title = currentLang === 'he' ? item.title_he : item.title_en;
    img.alt = title;
    img.src = item.image_url || 'assets/default-gallery.jpg';
    
    const info = document.createElement('div');
    info.className = 'gallery-info';
    info.innerHTML = `
        <h3>${title || ''}</h3>
        ${item.description_he || item.description_en ? 
            `<p class="description">${currentLang === 'he' ? item.description_he : item.description_en}</p>` : ''}
        ${item.artist_name_he || item.artist_name_en ? 
            `<p class="artist">${currentLang === 'he' ? item.artist_name_he : item.artist_name_en}</p>` : ''}
    `;
    
    imageWrapper.appendChild(img);
    card.appendChild(imageWrapper);
    card.appendChild(info);
    
    // Handle image loading
    img.onerror = () => {
        console.error('Failed to load image:', item.image_url);
        if (img.src !== 'assets/default-gallery.jpg') {
            img.src = 'assets/default-gallery.jpg';
        }
    };
    
    // Add click handler
    card.addEventListener('click', () => {
        window.location.href = `gallery-item.html?id=${item.id}`;
    });
    
    container.appendChild(card);
}

function renderGalleryPreview(container, count = 6) {
    if (!container) return;
    
    container.innerHTML = '';
    const itemsToShow = galleryData.slice(0, count);
    
    itemsToShow.forEach(item => {
        renderGalleryItem(item, container);
    });
}

function renderGalleryPage() {
    const container = document.querySelector('#gallery-grid');
    if (!container) {
        console.warn('Gallery page: Missing container');
        return;
    }

    try {
        console.log('Rendering gallery page:', galleryData);
        container.innerHTML = '';
        
        galleryData.forEach(item => renderGalleryItem(item, container));
    } catch (error) {
        console.error('Error rendering gallery page:', error);
        container.innerHTML = '<div class="error-message">Error loading gallery</div>';
    }
}

function renderCoursesPreview(container, count = 9) {
    if (!container) return;
    
    container.innerHTML = '';
    const coursesToShow = coursesData.slice(0, count);
    
    coursesToShow.forEach(course => {
        console.log('Rendering course:', course);
        
        const courseElement = document.createElement('div');
        courseElement.className = 'course-item';
        courseElement.onclick = () => window.location.href = `course-item.html?id=${course.id}`;
        
        const name = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;
        
        console.log('Course name:', name);
        console.log('Course description:', description);
        
        courseElement.innerHTML = `
            <div class="course-content">
                <h3>${name || ''}</h3>
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
        
        container.appendChild(courseElement);
    });
}

async function renderCoursesPage() {
    console.log('Rendering courses page');
    console.log('Current courses data:', coursesData);

    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid) {
        console.error('Could not find courses-grid element');
        return;
    }

    if (!coursesData || coursesData.length === 0) {
        console.log('No courses data available');
        coursesGrid.innerHTML = `
            <div class="no-results">
                ${currentLang === 'he' ? 'אין קורסים זמינים' : 'No courses available'}
            </div>
        `;
        return;
    }

    coursesGrid.innerHTML = '';
    coursesData.forEach(course => {
        console.log('Processing course:', course);
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.onclick = () => window.location.href = `course-item.html?id=${course.id}`;

        const name = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;

        console.log('Course name:', name);
        console.log('Course description:', description);

        courseCard.innerHTML = `
            <div class="course-content">
                <h3>${name || ''}</h3>
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

        coursesGrid.appendChild(courseCard);
    });
}

function renderCourses(courses) {
    console.log('Rendering courses:', courses);
    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid) return;

    coursesGrid.innerHTML = '';
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.onclick = () => window.location.href = `course-item.html?id=${course.id}`;

        const name = currentLang === 'he' ? course.title_he : course.title_en;
        const description = currentLang === 'he' ? course.description_he : course.description_en;

        courseCard.innerHTML = `
            <div class="course-content">
                <h3>${name || ''}</h3>
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

        coursesGrid.appendChild(courseCard);
    });
}

function renderMembers(container, limit = null) {
    if (!container) return;
    
    container.innerHTML = '';
    let membersToShow = membersData;
    
    if (limit && !window.membersExpanded) {
        membersToShow = membersData.slice(0, limit);
    }
    
    membersToShow.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.onclick = () => window.location.href = `member.html?id=${member.id}`;
        
        memberCard.innerHTML = `
            <div class="member-image">
                <img src="${member.image_url || 'assets/default-profile.jpg'}" 
                     alt="${currentLang === 'he' ? member.name_he : member.name_en}"
                     onerror="this.src='assets/default-profile.jpg'">
            </div>
            <div class="member-info">
                <h3>${currentLang === 'he' ? member.name_he : member.name_en}</h3>
                ${member.role_he || member.role_en ? 
                    `<p class="member-role">${currentLang === 'he' ? member.role_he : member.role_en}</p>` : ''}
            </div>
        `;
        
        container.appendChild(memberCard);
    });
}

// Page Initializers
async function initHomePage() {
    console.log('Initializing home page');
    if (!dataInitialized) await initializeAppData();
    
    const galleryPreview = document.getElementById('gallery-preview');
    const coursesPreview = document.getElementById('courses-preview');
    const membersGrid = document.getElementById('members-grid');
    const toggleBtn = document.getElementById('toggle-members');
    
    // Initialize members section
    if (membersGrid && membersData.length > 0) {
        // Shuffle members initially
        let shuffledMembers = [...membersData];
        for (let i = shuffledMembers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledMembers[i], shuffledMembers[j]] = [shuffledMembers[j], shuffledMembers[i]];
        }
        
        // Render initial state
        window.membersExpanded = false;
        renderMembers(membersGrid, 15);
    }
    
    // Add click handler for toggle button
    if (toggleBtn) {
        toggleBtn.onclick = toggleMembers;
    }

    if (galleryPreview && !galleryPreview.hasChildNodes()) {
        console.log('Rendering gallery preview');
        renderGalleryPreview(galleryPreview, 6);
    }

    if (coursesPreview && !coursesPreview.hasChildNodes()) {
        renderCoursesPreview(coursesPreview, 6);
    }
}

async function initGalleryPage() {
    console.log('Initializing gallery page');
    if (!dataInitialized) await initializeAppData();
    
    // Initialize language toggle first
    initLanguageToggle();
    
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        renderGalleryPage();
    }
}

async function initCoursesPage() {
    console.log('Initializing courses page');
    if (!dataInitialized) {
        await initializeAppData();
    }
    
    // Initialize language toggle first
    initLanguageToggle();
    
    // Render the courses
    renderCoursesPage();
    
    // Set initial search input placeholder and handler
    const searchInput = document.getElementById('courses-search-input');
    if (searchInput) {
        // Set initial placeholder based on language
        searchInput.placeholder = currentLang === 'he' ? 
            'חפש קורסים, מרצים או נושאים' : 
            'Search courses, teachers, or topics';
            
        // Add search input handler
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Filter courses based on search term
            const filteredCourses = coursesData.filter(course => {
                const nameMatch = (course.title_he?.toLowerCase().includes(searchTerm) || 
                                course.title_en?.toLowerCase().includes(searchTerm));
                const descMatch = (course.description_he?.toLowerCase().includes(searchTerm) || 
                                course.description_en?.toLowerCase().includes(searchTerm));
                
                // Also search through teacher names if available
                const teacherMatch = course.teachers?.some(teacher => {
                    return teacher.name_he?.toLowerCase().includes(searchTerm) ||
                        teacher.name_en?.toLowerCase().includes(searchTerm);
                });
                
                return nameMatch || descMatch || teacherMatch;
            });
            
            // Re-render with filtered courses
            renderCourses(filteredCourses);
        });
    }
}

async function initCourseItemPage() {
    console.log('Initializing course item page');
    if (!dataInitialized) await initializeAppData();
    
    // Initialize language toggle
    initLanguageToggle();
    
    // Get course ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (!courseId || !coursesData) return;
    
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;
    
    console.log('Found course:', course);
    
    // Update course info
    const titleElement = document.getElementById('course-title');
    if (titleElement) {
        const title = currentLang === 'he' ? course.title_he : course.title_en;
        titleElement.textContent = title || '';
    }
    
    const descElement = document.getElementById('course-description');
    if (descElement) {
        const description = currentLang === 'he' ? course.description_he : course.description_en;
        descElement.textContent = description || '';
    }
    
    // Add teachers if available
    if (course.teachers && course.teachers.length > 0) {
        const teachersContainer = document.getElementById('teachers-container');
        if (teachersContainer) {
            teachersContainer.innerHTML = course.teachers.map(teacher => {
                if (!teacher) return '';
                
                const teacherName = currentLang === 'he' ? teacher.name_he : teacher.name_en;
                const teacherRole = currentLang === 'he' ? teacher.role_he : teacher.role_en;
                
                return `
                    <div class="teacher" onclick="window.location.href='member.html?id=${teacher.id}'">
                        <img src="${teacher.image_url || 'assets/default-profile.jpg'}" 
                             alt="${teacherName || ''}" 
                             title="${teacherName || ''}"
                             onerror="this.src='assets/default-profile.jpg'">
                        <div class="teacher-info">
                            <h3>${teacherName || ''}</h3>
                            ${teacherRole ? `<p>${teacherRole}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Add difficulty if available
    const difficultyElement = document.getElementById('course-difficulty');
    if (difficultyElement && course.difficulty) {
        const difficulty = currentLang === 'he' ? course.difficulty_he : course.difficulty_en;
        difficultyElement.textContent = difficulty || '';
    }
    
    // Add duration if available
    const durationElement = document.getElementById('course-duration');
    if (durationElement && course.duration) {
        const duration = currentLang === 'he' ? course.duration_he : course.duration_en;
        durationElement.textContent = duration || '';
    }
    
    // Add categories if available
    const categoriesContainer = document.getElementById('course-categories');
    if (categoriesContainer && course.categories) {
        const categories = Array.isArray(course.categories) ? course.categories : [course.categories];
        categoriesContainer.innerHTML = categories.map(cat => {
            const categoryName = currentLang === 'he' ? cat.name_he : cat.name_en;
            return `<span class="category">${categoryName || ''}</span>`;
        }).join('');
    }
    
    // Add subtopics if available
    const subtopicsList = document.getElementById('subtopics-list');
    if (subtopicsList && course.subtopics) {
        const topics = Array.isArray(course.subtopics) ? course.subtopics : [course.subtopics];
        subtopicsList.innerHTML = topics.map(topic => {
            const topicName = currentLang === 'he' ? topic.name_he : topic.name_en;
            return `<li>${topicName || ''}</li>`;
        }).join('');
    }
}

async function initMemberPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    
    if (!memberId || !membersData) return;
    
    const member = membersData.find(m => m.id === memberId);
    if (!member) return;
    
    // Update member info
    document.getElementById('member-image').src = member.image_url || 'assets/default-member.jpg';
    
    const nameElement = document.getElementById('member-name');
    if (nameElement) {
        nameElement.querySelector('[data-lang="he"]').textContent = member.name.he;
        nameElement.querySelector('[data-lang="en"]').textContent = member.name.en;
    }
    
    const roleElement = document.getElementById('member-role');
    if (roleElement) {
        roleElement.querySelector('[data-lang="he"]').textContent = member.role?.he || '';
        roleElement.querySelector('[data-lang="en"]').textContent = member.role?.en || '';
    }
    
    const bioElement = document.getElementById('member-bio');
    if (bioElement) {
        bioElement.querySelector('[data-lang="he"]').textContent = member.bio?.he || '';
        bioElement.querySelector('[data-lang="en"]').textContent = member.bio?.en || '';
    }
    
    // Render member's gallery
    const galleryContainer = document.getElementById('member-gallery');
    if (galleryContainer) {
        const memberGallery = galleryData.filter(item => item.artist === memberId);
        memberGallery.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            galleryItem.innerHTML = `
                <img src="${item.imageUrl}" alt="${getLangText(item.title, currentLang)}" onerror="this.src='assets/placeholder.jpg'">
                <div class="overlay">
                    <h3>${getLangText(item.title, currentLang)}</h3>
                    <p>${getLangText(item.description, currentLang)}</p>
                </div>
            `;
            
            galleryItem.addEventListener('click', () => {
                window.location.href = `gallery-item.html?id=${item.id}`;
            });
            
            galleryContainer.appendChild(galleryItem);
        });
    }
    
    // Render member's courses
    const coursesContainer = document.getElementById('member-courses');
    if (coursesContainer) {
        const memberCourses = coursesData.filter(course => 
            course.teachers && course.teachers.some(teacher => teacher.id === memberId)
        );
        
        memberCourses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.onclick = () => window.location.href = `course-item.html?id=${course.id}`;
            
            courseCard.innerHTML = `
                <h3>${course.title_he || course.title_en}</h3>
                <p>${course.description_he || course.description_en}</p>
            `;
            
            coursesContainer.appendChild(courseCard);
        });
    }
}

async function initGalleryItemPage() {
    console.log('Initializing gallery item page');
    if (!dataInitialized) await initializeAppData();
    
    // Initialize language toggle
    initLanguageToggle();
    
    // Get gallery item ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    
    if (!itemId || !galleryData) return;
    
    const item = galleryData.find(i => i.id === itemId);
    if (!item) return;
    
    // Update gallery item info
    const imageElement = document.getElementById('gallery-item-image');
    if (imageElement) {
        imageElement.src = item.imageUrl;
        imageElement.alt = getLangText(item.title, currentLang);
        imageElement.onerror = () => {
            imageElement.src = 'assets/default-gallery.jpg';
        };
    }
    
    const titleElement = document.getElementById('gallery-item-title');
    if (titleElement) {
        titleElement.textContent = getLangText(item.title, currentLang);
    }
    
    const descElement = document.getElementById('gallery-item-description');
    if (descElement) {
        descElement.textContent = getLangText(item.description, currentLang);
    }
    
    // Add artist info if available
    if (item.artist) {
        const artist = membersData.find(m => m.id === item.artist);
        if (artist) {
            const artistContainer = document.getElementById('gallery-item-artist-container');
            if (artistContainer) {
                artistContainer.innerHTML = `
                    <img src="${artist.image_url}" alt="${getLangText(artist.name, currentLang)}" 
                         title="${getLangText(artist.name, currentLang)}">
                    <span>${getLangText(artist.name, currentLang)}</span>
                `;
                artistContainer.onclick = () => window.location.href = `member.html?id=${artist.id}`;
            }
        }
    }
}

// Login handling
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const data = await login(username, password);
        if (data.token && data.memberId) {
            localStorage.setItem('sessionToken', data.token);
            localStorage.setItem('memberId', data.memberId);
            window.location.href = `member.html?id=${data.memberId}`;
        } else {
            throw new Error('Invalid login response');
        }
    } catch (error) {
        console.error('Login failed:', error);
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) {
            errorMsg.textContent = currentLang === 'he' ? 
                'שם משתמש או סיסמה שגויים' : 
                'Invalid username or password';
            errorMsg.style.display = 'block';
        }
    }
}

// Logout handling
function handleLogout() {
    logout();
    window.location.href = 'index.html';
}

// Initialize login page
async function initLoginPage() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
}

// Page Routing
async function initializePage() {
    const path = window.location.pathname;
    
    try {
        await initializeAppData();
        
        if (path.endsWith('index.html') || path === '/') {
            await initHomePage();
        } else if (path.includes('gallery.html')) {
            await initGalleryPage();
        } else if (path.includes('courses.html')) {
            await initCoursesPage();
        } else if (path.includes('member.html')) {
            await initMemberPageEditMode();
        } else if (path.includes('gallery-item.html')) {
            await initGalleryItemPage();
        } else if (path.includes('course-item.html')) {
            await initCourseItemPage();
        } else if (path.includes('login.html')) {
            await initLoginPage();
        }
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

// Initialize member page with edit mode
async function initMemberPageEditMode() {
    const memberId = getMemberIdFromUrl();
    const sessionToken = localStorage.getItem('sessionToken');
    const loggedInMemberId = localStorage.getItem('memberId');
    
    if (memberId) {
        try {
            const memberData = await getMemberById(memberId);
            if (memberData) {
                // Check if logged in as this member
                const isOwnProfile = sessionToken && loggedInMemberId === memberId;
                
                // Update UI based on login state
                document.body.classList.toggle('edit-mode', isOwnProfile);
                
                // Show/hide edit controls
                const editControls = document.querySelectorAll('.edit-controls');
                editControls.forEach(control => {
                    control.style.display = isOwnProfile ? 'block' : 'none';
                });
                
                // Initialize edit handlers if logged in
                if (isOwnProfile) {
                    setupEditHandlers(memberData);
                }
                
                // Render member data
                updateMemberDisplay(memberData);
            }
        } catch (error) {
            console.error('Error loading member data:', error);
        }
    }
}

// Set up edit handlers for member page
function setupEditHandlers(memberData) {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(field => {
        field.contentEditable = true;
        field.addEventListener('blur', async (event) => {
            const fieldName = event.target.dataset.field;
            const value = event.target.textContent;
            
            try {
                const updatedData = { ...memberData };
                updatedData[fieldName] = value;
                
                await updateMember(memberData.id, updatedData);
                console.log('Successfully updated:', fieldName);
            } catch (error) {
                console.error('Failed to update:', error);
                // Revert changes on error
                event.target.textContent = memberData[fieldName];
            }
        });
    });
}

// Update member display
function updateMemberDisplay(memberData) {
    // Update name
    const nameHe = document.querySelector('[data-field="name_he"]');
    const nameEn = document.querySelector('[data-field="name_en"]');
    if (nameHe) nameHe.textContent = memberData.name_he || '';
    if (nameEn) nameEn.textContent = memberData.name_en || '';

    // Update role
    const roleHe = document.querySelector('[data-field="role_he"]');
    const roleEn = document.querySelector('[data-field="role_en"]');
    if (roleHe) roleHe.textContent = memberData.role_he || '';
    if (roleEn) roleEn.textContent = memberData.role_en || '';

    // Update bio
    const bioHe = document.querySelector('[data-field="bio_he"]');
    const bioEn = document.querySelector('[data-field="bio_en"]');
    if (bioHe) bioHe.textContent = memberData.bio_he || '';
    if (bioEn) bioEn.textContent = memberData.bio_en || '';

    // Update image
    const memberImage = document.getElementById('member-image');
    if (memberImage && memberData.image_url) {
        memberImage.src = memberData.image_url;
    }

    // Update gallery items
    const galleryGrid = document.getElementById('member-gallery-grid');
    if (galleryGrid && memberData.gallery_items) {
        galleryGrid.innerHTML = '';
        memberData.gallery_items.forEach(item => {
            const itemElement = renderGalleryItem(item, galleryGrid);
            if (itemElement) {
                galleryGrid.appendChild(itemElement);
            }
        });
    }

    // Update courses
    const coursesGrid = document.getElementById('member-courses-grid');
    if (coursesGrid && memberData.courses) {
        coursesGrid.innerHTML = '';
        memberData.courses.forEach(course => {
            const courseElement = renderCourseItem(course);
            if (courseElement) {
                coursesGrid.appendChild(courseElement);
            }
        });
    }
}

// Render a course item
function renderCourseItem(course) {
    const div = document.createElement('div');
    div.className = 'course-card';
    div.innerHTML = `
        <div class="course-image">
            <img src="${course.image_url || 'assets/default-course.jpg'}" alt="${course.title_he || course.title_en}">
        </div>
        <div class="course-info">
            <h3>
                <span data-lang="he">${course.title_he || ''}</span>
                <span data-lang="en" style="display:none;">${course.title_en || ''}</span>
            </h3>
            <p class="course-description">
                <span data-lang="he">${course.description_he || ''}</span>
                <span data-lang="en" style="display:none;">${course.description_en || ''}</span>
            </p>
        </div>
    `;
    div.onclick = () => {
        window.location.href = `course-item.html?id=${course.id}`;
    };
    return div;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // First initialize language
        initLanguageToggle();
        
        // Then initialize data and page
        await initializeAppData();
        await initializePage();
        
        // After data is loaded, update the display
        const galleryPreview = document.getElementById('gallery-preview');
        const coursesPreview = document.getElementById('courses-preview');
        
        if (galleryPreview) {
            renderGalleryPreview(galleryPreview);
        }
        if (coursesPreview) {
            renderCoursesPreview(coursesPreview);
        }

        // Check if we're on member page
        const path = window.location.pathname;
        if (path.includes('member.html')) {
            const memberId = getMemberIdFromUrl();
            if (memberId) {
                await loadMemberData(memberId);
                updateLanguageDisplay();
            }
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Expose necessary global functions
window.toggleLanguage = toggleLanguage;
window.toggleMembers = toggleMembers;
window.handleLogout = handleLogout;
