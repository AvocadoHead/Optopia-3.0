// Sample items data (in a real application, this would come from a server)
const items = [
    {
        id: 1,
        name: 'Premium Widget',
        description: 'High-quality widget for all your needs',
        price: 29.99,
        image: 'https://via.placeholder.com/200'
    },
    {
        id: 2,
        name: 'Super Gadget',
        description: 'Next-generation gadget with advanced features',
        price: 49.99,
        image: 'https://via.placeholder.com/200'
    },
    // Add more items as needed
];

// Function to create item cards
function createItemCard(item) {
    const card = document.createElement('div');
    card.classList.add('item-card');
    
    card.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="item-image">
        <div class="item-info">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <p class="item-price">$${item.price.toFixed(2)}</p>
        </div>
    `;
    
    return card;
}

// Function to filter items based on search input
function filterItems(searchText) {
    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase())
    );
    
    const itemsGrid = document.getElementById('itemsGrid');
    itemsGrid.innerHTML = '';
    
    filteredItems.forEach(item => {
        itemsGrid.appendChild(createItemCard(item));
    });
}

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', () => {
    // Display all items initially
    const itemsGrid = document.getElementById('itemsGrid');
    items.forEach(item => {
        itemsGrid.appendChild(createItemCard(item));
    });
    
    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        filterItems(e.target.value);
    });
});
