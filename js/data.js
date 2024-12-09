// Utility Functions
const Utils = {
    getLangText(obj, lang = 'he') {
        return obj[lang] || obj.en || '';
    },
    getMemberById(id) {
        return window.DATA.members.find(m => m.id === id);
    },
    getCourseById(id) {
        return window.DATA.courses.find(c => c.id === id);
    },
    getGalleryItemById(id) {
        return window.DATA.gallery.find(g => g.id === id);
    },
    getGalleryItemsByArtist(artistId) {
        return window.DATA.gallery.filter(g => g.artist === artistId);
    }
};

// Optopia Data Management
const DATA = {
    categories: [
        {
            id: 'ai-experts',
            name: { 
                he: 'מומחי בינה מלאכותית', 
                en: 'AI Experts' 
            }
        },
        {
            id: 'designers',
            name: { 
                he: 'מעצבים', 
                en: 'Designers' 
            }
        },
        {
            id: 'creators',
            name: { 
                he: 'יוצרים', 
                en: 'Creators' 
            }
        },
        {
            id: 'lecturers',
            name: { 
                he: 'מרצים', 
                en: 'Lecturers' 
            }
        }
    ],
    members: [], // Will be populated from members-data.js
    gallery: [], // Will be populated from gallery-data.js
    courses: []  // Will be populated from courses-data.js
};

// Link Utils to DATA
Utils.DATA = DATA;

// Expose to global scope
window.DATA = DATA;
window.Utils = Utils;
window.MEMBERS = DATA.members;