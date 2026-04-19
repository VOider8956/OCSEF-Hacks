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
    { id: 1, name: "Bread", days: 20, storage: "Pantry" },
    { id: 2, name: "Milk", days: 3, storage: "Refrigerate" },
    { id: 3, name: "Eggs", days: 7, storage: "Refrigerate" }
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
            ${item.name} - ${item.days} Days (${item.storage || 'Pantry'})
            <span class="delete-btn" onclick="deleteItem(${item.id})">×</span>
        `;
        
        // Add click handler to select item
        itemDiv.addEventListener('click', (e) => {
            // Don't select if clicking delete button
            if (e.target.classList.contains('delete-btn')) return;
            
            // Remove active class from all items
            document.querySelectorAll('.food-item').forEach(item => item.classList.remove('active'));
            // Add active class to clicked item
            itemDiv.classList.add('active');
        });
        
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

// Load the formatted.json data on startup
let expirationData = null;

async function loadExpirationData() {
    try {
        const response = await fetch('/formatted.json');
        const data = await response.json();
        
        console.log('JSON loaded, sheets:', data.sheets.map(s => s.name));
        
        // Find the Product sheet
        const productSheet = data.sheets.find(s => s.name === 'Product');
        console.log('Product sheet found:', !!productSheet, 'Rows:', productSheet?.data?.length);
        
        // Flatten the Product sheet - each row is an array of key-value pairs
        const products = productSheet?.data?.map(row => {
            const obj = {};
            row.forEach(pair => {
                const key = Object.keys(pair)[0];
                const value = pair[key];
                obj[key] = value;
            });
            return obj;
        }) || [];
        
        console.log('First product:', products[0]);
        
        // Find the Category sheet
        const categorySheet = data.sheets.find(s => s.name === 'Category');
        const categories = categorySheet?.data?.map(row => {
            const obj = {};
            row.forEach(pair => {
                const key = Object.keys(pair)[0];
                const value = pair[key];
                obj[key] = value;
            });
            return obj;
        }) || [];
        
        // Merge products with categories
        expirationData = products.map(product => {
            const category = categories.find(cat => cat.ID === product.Category_ID);
            return {
                ...product,
                Category_Name: category ? category.Category_Name : 'Unknown'
            };
        });
        
        console.log('Expiration data loaded:', expirationData.length, 'items');
    } catch (error) {
        console.error('Error loading expiration data:', error);
    }
}

// Helper function to check if item has any valid expiration data
function hasExpirationData(item) {
    // Check Pantry
    if (item.Pantry_Min != null && item.Pantry_Max != null && item.Pantry_Max > 0) return true;
    // Check Refrigerate
    if (item.Refrigerate_Min != null && item.Refrigerate_Max != null && item.Refrigerate_Max > 0) return true;
    // Check Frozen
    if (item.Frozen_Min != null && item.Frozen_Max != null && item.Frozen_Max > 0) return true;
    return false;
}

// Helper function to convert metric value to days
function convertToDays(value, metric) {
    if (value == null) return null;
    if (!metric) return value; // Default to days if no metric
    
    const metricLower = metric.toLowerCase();
    if (metricLower === 'weeks' || metricLower === 'week') {
        return value * 7;
    } else if (metricLower === 'months' || metricLower === 'month') {
        return value * 30;
    } else if (metricLower === 'years' || metricLower === 'year') {
        return value * 365;
    }
    return value; // Default to days
}

function searchExpiration(productName) {
    if (!expirationData) {
        console.log('Expiration data not loaded');
        return null;
    }
    
    // Search for exact match first, then partial match (only items with expiration data)
    let results = expirationData.filter(item => 
        item.Name && item.Name.toLowerCase() === productName.toLowerCase() && hasExpirationData(item)
    );
    
    // If no exact match, try partial match
    if (results.length === 0) {
        results = expirationData.filter(item => 
            item.Name && item.Name.toLowerCase().includes(productName.toLowerCase()) && hasExpirationData(item)
        );
    }

    if (results.length === 0) {
        console.log('Product not found:', productName);
        return null;
    }

    // Get the first matching item
    const item = results[0];
    console.log('Found:', item.Name, 'Pantry_Min:', item.Pantry_Min, 'Pantry_Max:', item.Pantry_Max);
    
    // Calculate all storage options and pick the longest
    const storageOptions = [];
    
    if (item.Pantry_Min != null && item.Pantry_Max != null && item.Pantry_Max > 0) {
        const minDays = convertToDays(item.Pantry_Min, item.Pantry_Metric);
        const maxDays = convertToDays(item.Pantry_Max, item.Pantry_Metric);
        storageOptions.push({ type: 'Pantry', days: maxDays - minDays });
    }
    if (item.Refrigerate_Min != null && item.Refrigerate_Max != null && item.Refrigerate_Max > 0) {
        const minDays = convertToDays(item.Refrigerate_Min, item.Refrigerate_Metric);
        const maxDays = convertToDays(item.Refrigerate_Max, item.Refrigerate_Metric);
        storageOptions.push({ type: 'Refrigerate', days: maxDays - minDays });
    }
    if (item.Frozen_Min != null && item.Frozen_Max != null && item.Frozen_Max > 0) {
        const minDays = convertToDays(item.Frozen_Min, item.Frozen_Metric);
        const maxDays = convertToDays(item.Frozen_Max, item.Frozen_Metric);
        storageOptions.push({ type: 'Frozen', days: maxDays - minDays });
    }
    
    // If no valid options, return null
    if (storageOptions.length === 0) {
        return null;
    }
    
    // Sort by days (longest first) and pick the best
    storageOptions.sort((a, b) => b.days - a.days);
    const bestOption = storageOptions[0];
    
    // If still no valid days, return null
    if (bestOption.days <= 0) {
        return null;
    }
    
    return { days_left: Math.floor(bestOption.days), storage: bestOption.type };
}

// Load data on script load
loadExpirationData();

// Set up autocomplete for manual entry
const manualNameInput = document.getElementById('manual-name');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');

if (manualNameInput) {
    manualNameInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length < 1) {
            suggestionsDropdown.style.display = 'none';
            return;
        }
        
        // Find matching products (only those with expiration data)
        const matches = expirationData
            ? expirationData.filter(item => 
                item.Name && 
                item.Name.toLowerCase().includes(query) &&
                hasExpirationData(item)
            ).slice(0, 10)  // Limit to 10 suggestions
            : [];
        
        if (matches.length === 0) {
            suggestionsDropdown.style.display = 'none';
            return;
        }
        
        // Build dropdown HTML
        suggestionsDropdown.innerHTML = matches.map(item => 
            `<div class="suggestion-item" data-name="${item.Name}">${item.Name}</div>`
        ).join('');
        
        suggestionsDropdown.style.display = 'block';
        
        // Add click handlers to suggestions
        suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(el => {
            el.addEventListener('click', function() {
                manualNameInput.value = this.getAttribute('data-name');
                suggestionsDropdown.style.display = 'none';
            });
        });
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!manualNameInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
            suggestionsDropdown.style.display = 'none';
        }
    });
}

// 1. HANDLER: Receipt Upload
const receiptInput = document.getElementById('receipt-upload');
if (receiptInput) {
    receiptInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('upload-status');
        statusEl.innerText = "Reading receipt... (this may take a moment)";

        try {
            // Use Tesseract.js to extract text from image
            const result = await Tesseract.recognize(file, 'eng', {
                logger: m => console.log(m)
            });
            
            const extractedText = result.data.text;
            console.log('Extracted text:', extractedText);
            
            // Parse the text to find food products
            const foundProducts = findProductsInText(extractedText);
            
            if (foundProducts.length === 0) {
                statusEl.innerText = "No food products found in receipt.";
                return;
            }
            
            // Add all found products to the list
            let addedCount = 0;
            for (const productName of foundProducts) {
                const result = searchExpiration(productName);
                if (result) {
                    addNewItemToList(productName, result.days_left, result.storage);
                    addedCount++;
                }
            }
            
            if (addedCount > 0) {
                statusEl.innerText = `Added ${addedCount} product(s) from receipt!`;
                alert(`Found and added ${addedCount} product(s) from receipt!`);
            } else {
                statusEl.innerText = "Found products but none have expiration data.";
            }
            
        } catch (error) {
            console.error("Error reading receipt:", error);
            statusEl.innerText = "Failed to read receipt.";
        }
    });
}

// Helper function to find products in extracted text
function findProductsInText(text) {
    if (!expirationData || !text) return [];
    
    const textLower = text.toLowerCase();
    const foundProducts = [];
    
    // Search through all products in database
    for (const item of expirationData) {
        if (!item.Name) continue;
        
        // Check if the product name appears in the extracted text
        if (textLower.includes(item.Name.toLowerCase())) {
            // Make sure it has expiration data
            if (hasExpirationData(item) && !foundProducts.includes(item.Name)) {
                foundProducts.push(item.Name);
            }
        }
    }
    
    console.log('Found products in text:', foundProducts);
    return foundProducts;
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
    try {
        // Use the searchExpiration function to look up the product
        const result = searchExpiration(foodName);
        
        // If no valid result, show error and return
        if (!result) {
            alert(`"${foodName}" not found in database. Please try a different product name.`);
            return;
        }
        
        const daysLeft = result.days_left;
        const storageType = result.storage;

        // Add to our local storage inventory
        addNewItemToList(foodName, daysLeft, storageType);
        
        alert(`${foodName} added! Expiring in ${daysLeft} days (${storageType}).`);

    } catch (error) {
        console.error("Error predicting expiration:", error);
        alert("Check console - Backend might be down.");
    }
}   

// 4. SAVE TO STORAGE
function addNewItemToList(name, days, storage) {
    // Get current items from storage or start empty
    let items = JSON.parse(localStorage.getItem('inventory')) || [];
    
    const newItem = {
        id: Date.now(), // Unique ID or you can use a library like uuid for better IDs because Date.now() can cause collisions if you add items very quickly and because **** you
        name: name,
        days: parseInt(days),
        storage: storage || 'Pantry'
    };

    items.push(newItem);
    localStorage.setItem('inventory', JSON.stringify(items));
}

/* ==========================================
    5. INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', updatePage);