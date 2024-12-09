import { getGalleryItemById } from './api-service.js';
import { getCurrentLang, setCurrentLang, handleError } from './utils.js';

let currentLang = getCurrentLang();

// Language toggle
window.toggleLanguage = function() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setCurrentLang(currentLang);
    updateLanguageDisplay();
    loadGalleryItem();  // Reload with new language
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

async function loadGalleryItem() {
    try {
        currentLang = getCurrentLang();
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');
        
        if (!itemId) {
            throw new Error('No item ID provided');
        }

        const item = await getGalleryItemById(itemId);
        if (!item) {
            throw new Error('Item not found');
        }

        renderGalleryItem(item);
    } catch (error) {
        console.error('Error loading gallery item:', error);
        handleError(error);
    }
}

function renderGalleryItem(item) {
    const container = document.querySelector('.gallery-item-container');
    if (!container) return;

    const title = currentLang === 'he' ? item.title_he : item.title_en;
    const description = currentLang === 'he' ? item.description_he : item.description_en;
    const artistName = item.artist ? (currentLang === 'he' ? item.artist.name_he : item.artist.name_en) : '';

    container.innerHTML = `
        <div class="gallery-item">
            <h1>${title || ''}</h1>
            ${artistName ? `
                <div class="artist-info" onclick="window.location.href='member.html?id=${item.artist.id}'">
                    <img src="${item.artist.image_url || ''}" 
                         alt="${artistName}"
                         onerror="this.src='assets/default-profile.jpg'"
                         class="artist-image">
                    <span class="artist-name">${artistName}</span>
                </div>
            ` : ''}
            <div class="gallery-image">
                <img src="${item.image_url || ''}" 
                     alt="${title || ''}" 
                     onerror="this.src='assets/default-gallery.jpg'">
            </div>
            <p class="description">${description || ''}</p>
            ${item.video_url ? `
                <div class="video-container">
                    <iframe src="${item.video_url}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                </div>
            ` : ''}
            ${item.additional_images && item.additional_images.length > 0 ? `
                <div class="additional-images">
                    ${item.additional_images.map(imgUrl => `
                        <div class="additional-image">
                            <img src="${imgUrl}" 
                                 alt="${title}" 
                                 onerror="this.src='assets/default-gallery.jpg'">
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateLanguageDisplay();
    loadGalleryItem();
});
