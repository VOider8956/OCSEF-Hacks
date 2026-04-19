/* ==========================================
    1. MENU & NAVIGATION LOGIC
   ========================================== */
function openMenu() {
    const menu = document.getElementById("settingsSideMenu");
    if (menu) menu.classList.add("active");
}

function closeMenu() {
    const menu = document.getElementById("settingsSideMenu");
    if (menu) menu.classList.remove("active");
}

/* ==========================================
    2. DARK MODE LOGIC
   ========================================== */
const toggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Load theme on start
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    body.classList.add('dark-theme');
    if (toggle) toggle.checked = true;
}

if (toggle) {
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

/* ==========================================
    3. EXPIRATION LIST & NOTIFICATIONS
   ========================================== */


let inventory = JSON.parse(localStorage.getItem('inventory')) || [
    { id: 1, name: "Bread", days: 20 },
    { id: 2, name: "Milk", days: 3 },
    { id: 3, name: "Eggs", days: 7 }
];

function updatePage() {
    const listContainer = document.getElementById('food-list-container');
    const notifContainer = document.getElementById('notif-container');

    // Only run if we are on the Expiration List page
    if (!listContainer || !notifContainer) return;

    // Load Notice Time from localStorage (Defaults to 7 if empty)
    const userNoticeTime = parseInt(localStorage.getItem('noticeTime')) || 7;

    inventory.sort((a, b) => a.days - b.days);

    listContainer.innerHTML = '';
    notifContainer.innerHTML = '';

    inventory.forEach((item, index) => {
        // --- Left Side: List ---
        const itemDiv = document.createElement('div');
        itemDiv.className = `food-item ${index === 0 ? 'active' : ''}`;
        itemDiv.innerHTML = `
            ${item.name} - Expires in ${item.days} Days
            <span class="delete-btn" onclick="deleteItem(${item.id})">×</span>
        `;
        listContainer.appendChild(itemDiv);

        // --- Right Side: Notifications ---
        if (item.days <= userNoticeTime) {
            const card = document.createElement('div');
            card.className = 'notif-card';
            card.innerHTML = `
                <p><strong>${item.name}</strong> will expire in ${item.days} days!</p>
                <p class="suggestion"><em>Threshold: ${userNoticeTime} days</em></p>
            `;
            notifContainer.appendChild(card);
        }
    });
}

window.deleteItem = function(id) {
    // 1. Remove from the local variable
    inventory = inventory.filter(item => item.id !== id);
    
    // 2. Save the new, smaller list back to Local Storage
    localStorage.setItem('inventory', JSON.stringify(inventory));
    
    // 3. Refresh the screen
    updatePage();
};

/* ==========================================
    4. SETTINGS SAVING (Notice Time)
   ========================================== */
const noticeInput = document.getElementById('notice-time-input');

if (noticeInput) {
    // Load existing value into the input box
    noticeInput.value = localStorage.getItem('noticeTime') || 7;

    noticeInput.addEventListener('change', (e) => {
        localStorage.setItem('noticeTime', e.target.value);
        // Live update the list if the user is looking at it
        updatePage();
    });
}
/* ==========================================
    ADD PAGE LOGIC (Back-end Pipeline)
   ========================================== */

// 1. HANDLER: Receipt Upload
const receiptInput = document.getElementById('receipt-upload');
if (receiptInput) {
    receiptInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('upload-status').innerText = "Reading receipt...";

        // Tam Tu's Backend expects a FormData with the file under the key 'receipt'
        // This is later sent to the /api/read-receipt endpoint which will return the name of the food item
        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await fetch('/api/read-receipt', { // backend's endpoint
                method: 'POST',
                body: formData
            });
            const data = await response.json(); 
            // Expecting data.name from the backend which is the name of the food item extracted from the receipt
            
            // B. Pass name to the next step in the pipeline to get expiration and add to list
            getExpirationAndAdd(data.name);
        } catch (error) {
            console.error("Error reading receipt:", error);
            document.getElementById('upload-status').innerText = "Failed to read receipt.";
        }
    });
}

// 2. HANDLER: Manual Entry
window.handleManualAdd = async function() { 
    const nameInput = document.getElementById('manual-name');
    const name = nameInput.value.trim();
    
    if (name) {
        nameInput.value = ''; 
        getExpirationAndAdd(name);
    }
};

// 3. THE PIPELINE: Talk to Expiration Backend
async function getExpirationAndAdd(foodName) {
    const useBackend = false; // Set this to TRUE when you are ready to test because it will try to talk to the Python backend. For now, it just mocks the response with a random number of days.

    try {
        let daysLeft;

        if (useBackend) {
            // Awaiting response from the backend which predicts expiration based on the food name
            const response = await fetch(`/api/predict-expiration?name=${foodName}`);
            const data = await response.json();
            daysLeft = data.days_left;
        } else {
            // MOCK MODE: Since we don't have the backend set up, we'll just generate a random number of days until expiration for demonstration purposes.
            // Generates a random number between 1 and 14
            daysLeft = Math.floor(Math.random() * 14) + 1;
            console.log(`Mock Mode: Predicting ${daysLeft} days for ${foodName}`);
        }

        // Add to our local storage inventory
        addNewItemToList(foodName, daysLeft);
        
        alert(`${foodName} added! Expiring in ${daysLeft} days.`);

        // Redirect to the list page so you can see it in action. You can comment this out during development if you want to stay on the add page.
        // window.location.href = "/templates/List.html"; 

    } catch (error) {
        console.error("Error predicting expiration:", error);
        alert("Check console - Backend might be down.");
    }
}   

// 4. SAVE TO STORAGE
function addNewItemToList(name, days) {
    // Get current items from storage or start empty
    let items = JSON.parse(localStorage.getItem('inventory')) || [];
    
    const newItem = {
        id: Date.now(), // Unique ID or you can use a library like uuid for better IDs because Date.now() can cause collisions if you add items very quickly
        name: name,
        days: parseInt(days)
    };

    items.push(newItem);
    localStorage.setItem('inventory', JSON.stringify(items));
}

/* ==========================================
    5. INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', updatePage);