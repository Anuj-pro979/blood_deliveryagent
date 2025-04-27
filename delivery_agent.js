// DOM Elements - Will be initialized based on the current page
let googleLoginBtn;
let logoutBtn;
let deliveryAgentRegistrationForm;
let onlineStatusToggle;
let refreshBtn;
let deliveriesContainer;
let noDeliveries;
let debugStatus;
let profileForm;
let saveSettingsBtn;
let deliveryHistoryContainer;

// Current user data
let currentUser = null;
let currentUserData = null;
let currentLocation = null;

// Function to get current location
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                resolve(location);
            },
            error => {
                console.error('Geolocation error:', error);
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize common elements
    googleLoginBtn = document.getElementById('googleLogin');
    logoutBtn = document.getElementById('logoutBtn');
    debugStatus = document.getElementById('debug-status');
    
    // Set up Google login button if on index page
    if (googleLoginBtn && window.location.pathname.includes('index.html')) {
        googleLoginBtn.addEventListener('click', () => {
            auth.signInWithPopup(googleProvider)
                .catch(error => {
                    console.error('Google login error:', error);
                    updateDebug(`Google login error: ${error.message}`);
                    alert('Error signing in with Google. Please try again.');
                });
        });
    }
    
    // Set up logout button if it exists
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
    
    // Test Firebase connection
    testFirebaseConnection();
    
    // Initialize page-specific elements based on the current page
    initPageElements();
});

// Helper function to update debug information
function updateDebug(message) {
    if (debugStatus) {
        debugStatus.textContent = message;
        console.log('Debug:', message);
    }
}

// Test Firebase connection
function testFirebaseConnection() {
    updateDebug('Testing Firebase connection...');
    
    try {
        // Check if we have Firebase initialized
        if (!firebase || !firebase.app) {
            updateDebug('ERROR: Firebase not initialized');
            return;
        }
        
        // Check Firestore connection by fetching a simple document
        db.collection('bloodRequests').limit(1).get()
            .then(() => {
                updateDebug('Firebase connection successful');
            })
            .catch(error => {
                updateDebug(`Firebase connection error: ${error.message}`);
                console.error('Firebase connection test failed:', error);
            });
    } catch (error) {
        updateDebug(`Firebase connection test error: ${error.message}`);
        console.error('Firebase connection test error:', error);
    }
}

// Auth state change listener
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        updateDebug(`User authenticated: ${user.email}`);
        currentUser = user;
        
        // Check if we're on the registration page
        if (window.location.pathname.includes('registration.html')) {
            // Let the registration page handle the user
            initRegistrationPage(user);
            return;
        }
        
        // Check if user exists in our database as a delivery agent
        db.collection('deliveryAgents').doc(user.uid).get()
            .then((doc) => {
                if (!doc.exists) {
                    // User doesn't exist as a delivery agent, redirect to registration
                    console.log('New delivery agent, redirecting to registration');
                    window.location.href = 'registration.html';
                } else {
                    // User exists, store data and initialize the page
                    currentUserData = doc.data();
                    if (window.location.pathname.includes('index.html')) {
                        window.location.href = 'dashboard.html';
                    } else {
                        initPageElements();
                        loadPageData();
                    }
                }
            })
            .catch(error => {
                console.error('Error checking user in database:', error);
                updateDebug(`ERROR: ${error.message}`);
            });
    } else {
        // User is signed out
        console.log('User logged out');
        updateDebug('User not authenticated, redirecting...');
        currentUser = null;
        currentUserData = null;
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Initialize page elements based on the current page
function initPageElements() {
    const currentPath = window.location.pathname;
    console.log('Initializing page elements for path:', currentPath);
    
    if (currentPath.includes('dashboard.html') || currentPath.includes('delivery.html')) {
        // Dashboard page elements
        onlineStatusToggle = document.getElementById('onlineStatusToggle');
        refreshBtn = document.getElementById('refreshBtn');
        deliveriesContainer = document.getElementById('deliveriesContainer');
        noDeliveries = document.getElementById('noDeliveries');
        
        // Set up event listeners
        if (onlineStatusToggle) {
            onlineStatusToggle.addEventListener('change', toggleOnlineStatus);
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshDeliveries);
        }
    } else if (currentPath.includes('profile.html') || currentPath.includes('delivery-profile.html')) {
        // Profile page elements
        profileForm = document.getElementById('profileForm');
        saveSettingsBtn = document.getElementById('saveSettingsBtn');
        
        // Set up event listeners
        if (profileForm) {
            profileForm.addEventListener('submit', updateProfile);
        }
    } else if (currentPath.includes('history.html') || currentPath.includes('delivery-history.html')) {
        // History page elements
        deliveryHistoryContainer = document.getElementById('deliveryHistoryContainer');
    } else if (currentPath.includes('registration.html')) {
        // Registration page elements
        deliveryAgentRegistrationForm = document.getElementById('deliveryAgentRegistrationForm');
        googleLoginBtn = document.getElementById('googleLogin');
        
        // Set up event listeners
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                auth.signInWithPopup(googleProvider)
                    .catch(error => {
                        console.error('Google login error:', error);
                        updateDebug(`Google login error: ${error.message}`);
                    });
            });
        }
        
        if (deliveryAgentRegistrationForm) {
            deliveryAgentRegistrationForm.addEventListener('submit', registerDeliveryAgent);
        }
    } else if (currentPath.includes('delivery_details.html')) {
        // Delivery details page elements
        const markDeliveredBtn = document.getElementById('mark-delivered-btn');
        const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        const getPickupDirectionsBtn = document.getElementById('get-pickup-directions');
        const getDropDirectionsBtn = document.getElementById('get-drop-directions');
        
        // Set up event listeners
        if (markDeliveredBtn) {
            markDeliveredBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to mark this delivery as delivered?')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const deliveryId = urlParams.get('id');
                    if (deliveryId) {
                        markDeliveryAsCompleted(deliveryId);
                    } else {
                        alert('Delivery ID not found');
                    }
                }
            });
        }
        
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }
        
        if (getPickupDirectionsBtn) {
            getPickupDirectionsBtn.addEventListener('click', () => {
                const pickupAddress = document.getElementById('pickup-address').textContent;
                if (pickupAddress) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`, '_blank');
                }
            });
        }
        
        if (getDropDirectionsBtn) {
            getDropDirectionsBtn.addEventListener('click', () => {
                const dropAddress = document.getElementById('drop-address').textContent;
                if (dropAddress) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropAddress)}`, '_blank');
                }
            });
        }
        
        // Load delivery details
        const urlParams = new URLSearchParams(window.location.search);
        const deliveryId = urlParams.get('id');
        if (deliveryId) {
            loadDeliveryDetails(deliveryId);
        } else {
            updateDebug('No delivery ID provided');
        }
    }
}

// Load page data based on the current page
function loadPageData() {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('dashboard.html') || currentPath.includes('delivery.html')) {
        // Load available deliveries
        loadAvailableDeliveries();
        
        // Get current location
        getCurrentLocation()
            .then(location => {
                currentLocation = location;
                console.log('Current location:', location);
            })
            .catch(error => {
                console.error('Error getting location:', error);
                updateDebug(`Location error: ${error.message}`);
            });
    } else if (currentPath.includes('profile.html') || currentPath.includes('delivery-profile.html')) {
        // Load profile data
        loadProfileData();
    } else if (currentPath.includes('history.html') || currentPath.includes('delivery-history.html')) {
        // Load delivery history
        loadDeliveryHistory();
    } else if (currentPath.includes('delivery_details.html')) {
        // Load delivery details
        const urlParams = new URLSearchParams(window.location.search);
        const deliveryId = urlParams.get('id');
        if (deliveryId) {
            loadDeliveryDetails(deliveryId);
        } else {
            updateDebug('No delivery ID provided');
            alert('No delivery ID provided. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        }
    }
}

// Toggle online status
function toggleOnlineStatus() {
    if (!currentUser) return;
    
    const isOnline = onlineStatusToggle.checked;
    updateDebug(`Setting online status to: ${isOnline ? 'Online' : 'Offline'}`);
    
    // Update user status in database
    db.collection('deliveryAgents').doc(currentUser.uid).update({
        isOnline: isOnline,
        lastStatusUpdate: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        updateDebug(`Status updated to: ${isOnline ? 'Online' : 'Offline'}`);
        
        // If going online, refresh deliveries
        if (isOnline) {
            refreshDeliveries();
        } else {
            // If going offline, clear deliveries
            if (deliveriesContainer) {
                deliveriesContainer.innerHTML = '';
            }
            if (noDeliveries) {
                noDeliveries.classList.remove('d-none');
                noDeliveries.textContent = 'You are currently offline. Go online to see available deliveries.';
            }
        }
    })
    .catch(error => {
        console.error('Error updating status:', error);
        updateDebug(`Error updating status: ${error.message}`);
        
        // Revert toggle if update failed
        onlineStatusToggle.checked = !isOnline;
    });
}

// Refresh available deliveries
function refreshDeliveries() {
    if (!currentUser || !onlineStatusToggle || !onlineStatusToggle.checked) {
        updateDebug('Cannot refresh: User is offline or not authenticated');
        return;
    }
    
    updateDebug('Refreshing available deliveries...');
    loadAvailableDeliveries();
}

// Load available deliveries
function loadAvailableDeliveries() {
    if (!deliveriesContainer || !currentUser) return;
    
    // Clear existing deliveries
    deliveriesContainer.innerHTML = '';
    
    // Show loading message
    updateDebug('Loading available deliveries...');
    
    // Get current location first
    getCurrentLocation()
        .then(location => {
            currentLocation = location;
            
            // Query blood requests that have 'found' status (Donor Found)
            return db.collection('bloodRequests')
                .where('status', '==', 'found')
                .get();
        })
        .then(snapshot => {
            if (snapshot.empty) {
                updateDebug('No deliveries available');
                if (noDeliveries) {
                    noDeliveries.classList.remove('d-none');
                }
                return;
            }
            
            // Hide no deliveries message
            if (noDeliveries) {
                noDeliveries.classList.add('d-none');
            }
            
            // Convert snapshot to array and limit to 5 deliveries
            const deliveries = [];
            snapshot.forEach(doc => {
                deliveries.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            // Limit to 5 deliveries
            const limitedDeliveries = deliveries.slice(0, 5);
            
            updateDebug(`Showing ${limitedDeliveries.length} of ${snapshot.size} available deliveries`);
            
            // Process each delivery
            limitedDeliveries.forEach(delivery => {
                createDeliveryCard(delivery.id, delivery.data);
            });
        })
        .catch(error => {
            console.error('Error loading deliveries:', error);
            updateDebug(`Error loading deliveries: ${error.message}`);
        });
}

// Create a delivery card
function createDeliveryCard(requestId, requestData) {
    if (!deliveriesContainer || !currentLocation) return;
    
    // Get template
    const template = document.getElementById('deliveryTemplate');
    if (!template) {
        console.error('Delivery template not found');
        return;
    }
    
    // Clone template
    const deliveryCard = template.content.cloneNode(true);
    
    // Calculate distances
    const donorLocation = requestData.donorLocation || { latitude: 0, longitude: 0 };
    const recipientLocation = requestData.recipientLocation || { latitude: 0, longitude: 0 };
    
    const pickupDistance = calculateDistance(
        currentLocation.latitude, 
        currentLocation.longitude, 
        donorLocation.latitude, 
        donorLocation.longitude
    );
    
    const dropDistance = calculateDistance(
        donorLocation.latitude, 
        donorLocation.longitude, 
        recipientLocation.latitude, 
        recipientLocation.longitude
    );
    
    // Set card data - remove pricing information
    const priceElement = deliveryCard.querySelector('.order-price');
    if (priceElement) {
        priceElement.style.display = 'none';
    }
    
    const commissionElement = deliveryCard.querySelector('.order-commission');
    if (commissionElement) {
        commissionElement.style.display = 'none';
    }
    
    // Set status badge based on user's online status
    const isAgentOnline = onlineStatusToggle && onlineStatusToggle.checked;
    deliveryCard.querySelector('.status-badge').textContent = isAgentOnline ? 'Online' : 'Offline';
    deliveryCard.querySelector('.status-badge').classList.add(isAgentOnline ? 'status-online' : 'status-offline');
    
    // Set pickup location (donor location)
    const pickupAddress = requestData.donorHospital || requestData.donorAddress || 'Donor Location';
    deliveryCard.querySelector('.pickup-address').textContent = pickupAddress;
    deliveryCard.querySelector('.pickup-details').textContent = requestData.donorAddress || 'Address not available';
    deliveryCard.querySelector('.pickup-km').textContent = `${pickupDistance.toFixed(1)} km`;
    
    // Set drop location (recipient hospital)
    deliveryCard.querySelector('.drop-address').textContent = requestData.hospital || 'Recipient Hospital';
    deliveryCard.querySelector('.drop-details').textContent = requestData.address || 'Address not available';
    deliveryCard.querySelector('.drop-km').textContent = `${dropDistance.toFixed(1)} km`;
    
    // Set order count badge (blood units)
    deliveryCard.querySelector('.order-count-badge').textContent = requestData.units || 1;
    
    // Create timer element
    const timerContainer = document.createElement('div');
    timerContainer.className = 'timer-container mt-2 text-center';
    timerContainer.innerHTML = `<div class="progress">
        <div class="progress-bar bg-warning" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
    </div>
    <small class="text-muted mt-1 d-block">Time remaining: <span class="countdown">45</span> seconds</small>`;
    
    // Insert timer after the card body
    const cardBody = deliveryCard.querySelector('.card-body');
    if (cardBody) {
        cardBody.insertBefore(timerContainer, cardBody.querySelector('.action-buttons'));
    }
    
    // Set up buttons
    const declineBtn = deliveryCard.querySelector('.decline-btn');
    const acceptBtn = deliveryCard.querySelector('.accept-btn');
    
    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            // Remove the card when declined
            const cardElement = declineBtn.closest('.col-md-6');
            if (cardElement) {
                cardElement.remove();
            }
        });
    }
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            showDeliveryDetails(requestId, requestData);
        });
    }
    
    // Add data attribute for request ID
    const cardElement = deliveryCard.querySelector('.col-md-6');
    if (cardElement) {
        cardElement.setAttribute('data-request-id', requestId);
    }
    
    // Add the card to the container
    deliveriesContainer.appendChild(deliveryCard);
    
    // Start countdown timer (45 seconds)
    startCountdownTimer(deliveryCard, requestId, 45);
}

// Start countdown timer for a delivery card
function startCountdownTimer(deliveryCard, requestId, seconds) {
    const countdownElement = deliveryCard.querySelector('.countdown');
    const progressBar = deliveryCard.querySelector('.progress-bar');
    
    if (!countdownElement || !progressBar) return;
    
    let timeLeft = seconds;
    countdownElement.textContent = timeLeft;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        // Update progress bar
        const progressPercentage = (timeLeft / seconds) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        
        if (timeLeft <= 10) {
            progressBar.classList.remove('bg-warning');
            progressBar.classList.add('bg-danger');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            
            // Remove the card when time expires
            const cardElement = deliveryCard.closest('.col-md-6');
            if (cardElement) {
                // Fade out animation
                cardElement.style.transition = 'opacity 0.5s';
                cardElement.style.opacity = '0';
                
                setTimeout(() => {
                    cardElement.remove();
                    
                    // Update the request to indicate it was not accepted in time
                    db.collection('bloodRequests').doc(requestId).update({
                        rejectedAgents: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                        lastRejectedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => {
                        console.error('Error updating request:', error);
                    });
                }, 500);
            }
        }
    }, 1000);
    
    // Store the interval ID on the card element for cleanup
    deliveryCard.dataset.timerInterval = timerInterval;
}

// Show delivery details in modal
function showDeliveryDetails(requestId, requestData) {
    // Get modal elements
    const modal = document.getElementById('deliveryDetailsModal');
    if (!modal) {
        console.error('Delivery details modal not found');
        return;
    }
    
    // Set modal data
    document.getElementById('modal-donor-name').textContent = requestData.donorName || 'Not available';
    document.getElementById('modal-donor-blood-group').textContent = requestData.bloodGroup || 'Not available';
    document.getElementById('modal-donor-contact').textContent = requestData.donorContact || 'Not available';
    document.getElementById('modal-donor-address').textContent = requestData.donorAddress || 'Not available';
    
    document.getElementById('modal-patient-name').textContent = requestData.patientName || 'Not available';
    document.getElementById('modal-recipient-blood-group').textContent = requestData.bloodGroup || 'Not available';
    document.getElementById('modal-units').textContent = requestData.units || '1';
    document.getElementById('modal-hospital').textContent = requestData.hospital || 'Not available';
    document.getElementById('modal-recipient-contact').textContent = requestData.contactNumber || 'Not available';
    
    document.getElementById('modal-pickup-address').textContent = requestData.donorAddress || 'Not available';
    document.getElementById('modal-drop-address').textContent = requestData.address || 'Not available';
    
    // Set location inputs for directions
    document.getElementById('pickupInput').value = requestData.donorAddress || '';
    document.getElementById('dropInput').value = requestData.address || '';
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirmDeliveryBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            acceptDelivery(requestId, requestData);
        };
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Clear the timer for this card
    const cardElement = document.querySelector(`[data-request-id="${requestId}"]`);
    if (cardElement && cardElement.dataset.timerInterval) {
        clearInterval(parseInt(cardElement.dataset.timerInterval));
    }
}

// Accept delivery
function acceptDelivery(requestId, requestData) {
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Accepting delivery...');
    
    // Get delivery notes
    const deliveryNotes = document.getElementById('deliveryNotes').value;
    
    // Update the request in the database
    db.collection('bloodRequests').doc(requestId).update({
        status: 'delivered', // Update status to 'delivered' (Ready for Delivery)
        deliveryStatus: 'assigned',
        deliveryAgentId: currentUser.uid,
        deliveryAgentName: currentUserData ? currentUserData.fullName : currentUser.displayName,
        deliveryAgentContact: currentUserData ? currentUserData.phoneNumber : 'Not available',
        deliveryAssignedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deliveryNotes: deliveryNotes,
        statusHistory: firebase.firestore.FieldValue.arrayUnion({
            status: 'delivered',
            comment: `Blood ready for delivery. Assigned to ${currentUserData ? currentUserData.fullName : currentUser.displayName}`,
            timestamp: new Date().toISOString()
        })
    })
    .then(() => {
        updateDebug('Delivery accepted successfully');
        
        // Create a delivery record
        return db.collection('deliveries').add({
            requestId: requestId,
            deliveryAgentId: currentUser.uid,
            deliveryAgentName: currentUserData ? currentUserData.fullName : currentUser.displayName,
            patientName: requestData.patientName,
            donorName: requestData.donorName,
            bloodGroup: requestData.bloodGroup,
            units: requestData.units,
            pickupLocation: requestData.donorAddress,
            dropLocation: requestData.address,
            status: 'in_progress',
            notes: deliveryNotes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    })
    .then((docRef) => {
        // Close the modal
        const modal = document.getElementById('deliveryDetailsModal');
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
        
        // Redirect to delivery details page
        window.location.href = `delivery_details.html?id=${docRef.id}`;
    })
    .catch(error => {
        console.error('Error accepting delivery:', error);
        updateDebug(`Error accepting delivery: ${error.message}`);
        alert('Error accepting delivery. Please try again.');
    });
}

// Initialize registration page
function initRegistrationPage(user) {
    if (!deliveryAgentRegistrationForm) return;
    
    // Pre-fill email if user is logged in
    const emailInput = document.getElementById('email');
    if (emailInput && user) {
        emailInput.value = user.email;
        emailInput.readOnly = true;
    }
}

// Register delivery agent
function registerDeliveryAgent(e) {
    e.preventDefault();
    
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Registering delivery agent...');
    
    // Get form data
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const vehicleType = document.getElementById('vehicleType').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const address = document.getElementById('address').value;
    
    // Get location data
    const locationDataInput = document.getElementById('location-data');
    let locationData = null;
    
    if (locationDataInput && locationDataInput.value) {
        try {
            locationData = JSON.parse(locationDataInput.value);
        } catch (error) {
            console.error('Error parsing location data:', error);
        }
    }
    
    // Create delivery agent data
    const deliveryAgentData = {
        userId: currentUser.uid,
        fullName,
        email,
        phoneNumber,
        vehicleType,
        vehicleNumber,
        address,
        location: locationData,
        isOnline: false,
        isApproved: true, // Auto-approve for now
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to database
    db.collection('deliveryAgents').doc(currentUser.uid).set(deliveryAgentData)
        .then(() => {
            updateDebug('Delivery agent registered successfully');
            alert('Registration successful! You can now start accepting deliveries.');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        })
        .catch(error => {
            console.error('Error registering delivery agent:', error);
            updateDebug(`Error registering: ${error.message}`);
            alert('Error registering. Please try again.');
        });
}
// Load profile data
function loadProfileData() {
    if (!currentUser || !profileForm) return;
    
    updateDebug('Loading profile data...');
    
    // Get profile data from database
    db.collection('deliveryAgents').doc(currentUser.uid).get()
        .then(doc => {
            if (!doc.exists) {
                updateDebug('Profile not found');
                return;
            }
            
            const data = doc.data();
            
            // Fill form fields
            document.getElementById('fullName').value = data.fullName || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phoneNumber').value = data.phoneNumber || '';
            document.getElementById('vehicleType').value = data.vehicleType || '';
            document.getElementById('vehicleNumber').value = data.vehicleNumber || '';
            document.getElementById('address').value = data.address || '';
            
            updateDebug('Profile data loaded');
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            updateDebug(`Error loading profile: ${error.message}`);
        });
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Updating profile...');
    
    // Get form data
    const fullName = document.getElementById('fullName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const vehicleType = document.getElementById('vehicleType').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const address = document.getElementById('address').value;
    
    // Update profile data
    db.collection('deliveryAgents').doc(currentUser.uid).update({
        fullName,
        phoneNumber,
        vehicleType,
        vehicleNumber,
        address,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        updateDebug('Profile updated successfully');
        alert('Profile updated successfully!');
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        updateDebug(`Error updating profile: ${error.message}`);
        alert('Error updating profile. Please try again.');
    });
}

// Load delivery history
function loadDeliveryHistory() {
    if (!currentUser || !deliveryHistoryContainer) return;
    
    updateDebug('Loading delivery history...');
    
    // Clear existing history
    deliveryHistoryContainer.innerHTML = '';
    
    // Get delivery history from database
    db.collection('deliveries')
        .where('deliveryAgentId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                updateDebug('No delivery history found');
                deliveryHistoryContainer.innerHTML = `
                    <div class="alert alert-info text-center">
                        You haven't completed any deliveries yet.
                    </div>
                `;
                return;
            }
            
            updateDebug(`Found ${snapshot.size} deliveries in history`);
            
            // Process each delivery
            snapshot.forEach(doc => {
                const deliveryData = doc.data();
                createHistoryCard(doc.id, deliveryData);
            });
        })
        .catch(error => {
            console.error('Error loading delivery history:', error);
            updateDebug(`Error loading history: ${error.message}`);
        });
}

// Create a history card
function createHistoryCard(deliveryId, deliveryData) {
    if (!deliveryHistoryContainer) return;
    
    // Format date
    const createdAt = deliveryData.createdAt ? new Date(deliveryData.createdAt.toDate()) : new Date();
    const formattedDate = createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Create card
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';
    card.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <div>
                <span class="badge ${getStatusBadgeClass(deliveryData.status)}">${formatStatus(deliveryData.status)}</span>
                <span class="ms-2 text-muted">${formattedDate}</span>
            </div>
            <div>
                <strong>ID:</strong> ${deliveryId.substring(0, 8)}
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Patient:</strong> ${deliveryData.patientName || 'Not available'}</p>
                    <p><strong>Donor:</strong> ${deliveryData.donorName || 'Not available'}</p>
                    <p><strong>Blood Group:</strong> ${deliveryData.bloodGroup || 'Not available'}</p>
                    <p><strong>Units:</strong> ${deliveryData.units || '1'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Pickup:</strong> ${deliveryData.pickupLocation || 'Not available'}</p>
                    <p><strong>Drop:</strong> ${deliveryData.dropLocation || 'Not available'}</p>
                    <p><strong>Notes:</strong> ${deliveryData.notes || 'No notes'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Add 'Mark as Delivered' button for in-progress deliveries
    if (deliveryData.status === 'in_progress') {
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';
        cardFooter.innerHTML = `
            <button class="btn btn-success w-100 mark-delivered-btn">
                <i class="bi bi-check-circle"></i> Mark as Delivered
            </button>
        `;
        card.appendChild(cardFooter);
        
        // Add event listener to the button
        setTimeout(() => {
            const markDeliveredBtn = card.querySelector('.mark-delivered-btn');
            if (markDeliveredBtn) {
                markDeliveredBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to mark this delivery as delivered?')) {
                        markDeliveryAsCompleted(deliveryId);
                    }
                });
            }
        }, 0);
    }
    
    // Add to container
    deliveryHistoryContainer.appendChild(card);
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'completed':
            return 'bg-success';
        case 'in_progress':
            return 'bg-primary';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Helper function to format status
function formatStatus(status) {
    switch (status) {
        case 'in_progress':
            return 'In Progress';
        case 'completed':
            return 'Completed';
        case 'delivered':
            return 'Delivered';
        case 'cancelled':
            return 'Cancelled';
        default:
            return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Mark delivery as completed (delivered)
function markDeliveryAsCompleted(deliveryId) {
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Marking delivery as completed...');
    
    // Update delivery status in database
    // ✅ Update donation status to 'completed'
            db.collection('deliveries').doc(deliveryId).get()
            .then(doc => {
            if (!doc.exists) throw new Error('Delivery not found');
            
            const requestId = doc.data().requestId;

            // 🔍 Find the donation linked to this request
            return db.collection('donations')
                .where('requestId', '==', requestId)
                .limit(1)
                .get();
            })
            .then(snapshot => {
            if (!snapshot.empty) {
                const donationId = snapshot.docs[0].id;

                return db.collection('donations').doc(donationId).update({
                status: 'completed',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                    status: 'completed',
                    comment: 'Delivery agent marked donation as completed',
                    timestamp: new Date().toISOString()
                })
                });
            } else {
                console.warn('⚠️ No matching donation found');
            }
            })
            .then(() => {
            console.log('✅ Donation status updated to completed');
            })
            .catch(error => {
            console.error('❌ Error updating donation status:', error);
            });

    db.collection('deliveries').doc(deliveryId).update({
        status: 'completed',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        statusHistory: firebase.firestore.FieldValue.arrayUnion({
            status: 'completed',
            comment: 'Delivery agent marked delivery as completed',
            timestamp: new Date().toISOString()
        })
    })
    .then(() => {
        updateDebug('Delivery marked as completed');
        alert('Delivery marked as completed successfully!');
        
        // Redirect to dashboard if on delivery details page
        if (window.location.pathname.includes('delivery_details.html')) {
            window.location.href = 'dashboard.html';
        }
        // Refresh the page if on history page
        else if (window.location.pathname.includes('history.html')) {
            loadDeliveryHistory();
        }
    })
    .catch(error => {
        console.error('Error marking delivery as completed:', error);
        updateDebug(`Error: ${error.message}`);
        alert('Error marking delivery as completed. Please try again.');
    });
}

// Load delivery details for the delivery details page
function loadDeliveryDetails(deliveryId) {
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Loading delivery details...');
    
    // Get delivery data from database
    db.collection('deliveries').doc(deliveryId).get()
        .then(doc => {
            if (!doc.exists) {
                updateDebug('Delivery not found');
                alert('Delivery not found. Redirecting to dashboard.');
                window.location.href = 'dashboard.html';
                return;
            }
            
            const deliveryData = doc.data();
            
            // Update UI with delivery data
            document.getElementById('blood-group').textContent = deliveryData.bloodGroup || 'Not available';
            document.getElementById('blood-units').textContent = deliveryData.units || '1';
            document.getElementById('request-id').textContent = deliveryData.requestId ? deliveryData.requestId.substring(0, 8) : 'Not available';
            document.getElementById('donor-name').textContent = deliveryData.donorName || 'Not available';
            document.getElementById('patient-name').textContent = deliveryData.patientName || 'Not available';
            document.getElementById('pickup-address').textContent = deliveryData.pickupLocation || 'Not available';
            document.getElementById('drop-address').textContent = deliveryData.dropLocation || 'Not available';
            document.getElementById('delivery-notes').textContent = deliveryData.notes || 'No notes';
            
            // Format dates
            const createdAt = deliveryData.createdAt ? new Date(deliveryData.createdAt.toDate()) : new Date();
            document.getElementById('assigned-time').textContent = createdAt.toLocaleString('en-IN');
            document.getElementById('accepted-time').textContent = createdAt.toLocaleString('en-IN');
            
            // Update status badge
            const statusBadge = document.getElementById('delivery-status-badge');
            if (statusBadge) {
                if (deliveryData.status === 'in_progress') {
                    statusBadge.textContent = 'In Progress';
                    statusBadge.className = 'status-badge status-in-progress';
                } else if (deliveryData.status === 'delivered' || deliveryData.status === 'completed') {
                    statusBadge.textContent = 'Delivered';
                    statusBadge.className = 'status-badge status-completed';
                    
                    // Disable the mark as delivered button
                    const markDeliveredBtn = document.getElementById('mark-delivered-btn');
                    if (markDeliveredBtn) {
                        markDeliveredBtn.disabled = true;
                        markDeliveredBtn.textContent = 'Already Delivered';
                    }
                    
                    // Update timeline
                    const deliveredTimelineItem = document.getElementById('delivered-timeline-item');
                    if (deliveredTimelineItem) {
                        const timelineIcon = deliveredTimelineItem.querySelector('.timeline-icon');
                        if (timelineIcon) {
                            timelineIcon.className = 'timeline-icon bg-success';
                        }
                        
                        const deliveredTime = document.getElementById('delivered-time');
                        if (deliveredTime && deliveryData.completedAt) {
                            const completedAt = new Date(deliveryData.completedAt.toDate());
                            deliveredTime.textContent = completedAt.toLocaleString('en-IN');
                        }
                    }
                }
            }
            
            // Set estimated distance (placeholder)
            document.getElementById('estimated-distance').textContent = 'Calculating...';
            
            // Get distance between pickup and drop (if location-utils.js has this functionality)
            if (typeof calculateDistance === 'function') {
                try {
                    const distance = calculateDistance(deliveryData.pickupLocation, deliveryData.dropLocation);
                    document.getElementById('estimated-distance').textContent = distance;
                } catch (error) {
                    console.error('Error calculating distance:', error);
                    document.getElementById('estimated-distance').textContent = 'Not available';
                }
            } else {
                document.getElementById('estimated-distance').textContent = 'Not available';
            }
            
            updateDebug('Delivery details loaded successfully');
        })
        .catch(error => {
            console.error('Error loading delivery details:', error);
            updateDebug(`Error: ${error.message}`);
            alert('Error loading delivery details. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        });
} // End of auth.onAuthStateChanged
}
