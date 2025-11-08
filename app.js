// Strava Run Club Tracker - Static Website Version
// OAuth configuration - users will need to set their own client ID
const STRAVA_CONFIG = {
    clientId: '183792',
    redirectUri: window.location.origin + window.location.pathname,
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    scope: 'activity:read'
};

// DOM elements
const loginSection = document.getElementById('loginSection');
const configSection = document.getElementById('configSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');

const connectBtn = document.getElementById('connectBtn');
const configForm = document.getElementById('configForm');
const logoutBtn = document.getElementById('logoutBtn');
const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');
const retryBtn = document.getElementById('retryBtn');

// Utility: Generate random string for PKCE
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Utility: Generate code challenge for PKCE
async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// OAuth: Start authentication flow
async function startAuth() {
    const state = generateRandomString(32);

    // Store for later use
    sessionStorage.setItem('oauth_state', state);

    // Build auth URL (simplified - no PKCE since Strava doesn't fully support it)
    const params = new URLSearchParams({
        client_id: STRAVA_CONFIG.clientId,
        redirect_uri: STRAVA_CONFIG.redirectUri,
        response_type: 'token',
        scope: STRAVA_CONFIG.scope,
        state: state,
        approval_prompt: 'auto'
    });

    window.location.href = `${STRAVA_CONFIG.authUrl}?${params.toString()}`;
}

// OAuth: Handle callback (implicit grant - token in URL hash)
async function handleCallback() {
    // Check for errors in query params
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        showError(`Authentication failed: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Check for token in URL hash (implicit grant)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const expiresIn = hashParams.get('expires_in');
    const state = hashParams.get('state');

    if (accessToken) {
        const storedState = sessionStorage.getItem('oauth_state');

        if (state && state !== storedState) {
            showError('Invalid state parameter. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        try {
            // Calculate expiration time
            const expiresAt = Math.floor(Date.now() / 1000) + parseInt(expiresIn || '21600'); // Default 6 hours

            // Store access token
            sessionStorage.setItem('access_token', accessToken);
            sessionStorage.setItem('expires_at', expiresAt);

            // Clean up
            sessionStorage.removeItem('oauth_state');
            window.history.replaceState({}, document.title, window.location.pathname);

            // Show config section
            showSection('config');
        } catch (error) {
            showError(`Failed to authenticate: ${error.message}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// Haversine formula to calculate distance between two coordinates
function haversine(lon1, lat1, lon2, lat2) {
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    lon1 = toRadians(lon1);
    lat1 = toRadians(lat1);
    lon2 = toRadians(lon2);
    lat2 = toRadians(lat2);

    const dlon = lon2 - lon1;
    const dlat = lat2 - lat1;
    const a = Math.sin(dlat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon/2)**2;
    const c = 2 * Math.asin(Math.sqrt(a));
    const r = 6371; // Radius of earth in kilometers
    return c * r;
}

// Fetch all activities from Strava API
async function getStravaActivities(accessToken) {
    const activities = [];
    let page = 1;
    const perPage = 200;

    while (true) {
        const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
        }

        const batch = await response.json();

        if (batch.length === 0) {
            break;
        }

        activities.push(...batch);
        page++;
    }

    return activities;
}

// Check if an activity qualifies as a Run Club run
function isRunClubActivity(activity, clubLat, clubLon, maxDistanceKm) {
    // Check if it's a run
    if (activity.type !== 'Run') {
        return false;
    }

    // Check start location
    const startLatlng = activity.start_latlng;
    if (!startLatlng || startLatlng.length !== 2) {
        return false;
    }

    const [startLat, startLon] = startLatlng;
    const distanceKm = haversine(clubLon, clubLat, startLon, startLat);

    if (distanceKm > maxDistanceKm) {
        return false;
    }

    // Check time - use local time
    const startDateLocal = activity.start_date_local;
    if (!startDateLocal) {
        return false;
    }

    try {
        // Parse ISO 8601 format
        const dt = new Date(startDateLocal);

        // Check if Tuesday (getDay() returns 0 for Sunday, 1 for Monday, 2 for Tuesday, etc.)
        if (dt.getDay() !== 2) {
            return false;
        }

        // Check if between 18:45 and 19:15
        const hours = dt.getHours();
        const minutes = dt.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        const minTime = 18 * 60 + 45; // 18:45
        const maxTime = 19 * 60 + 15; // 19:15

        if (totalMinutes < minTime || totalMinutes > maxTime) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Calculate statistics for run club activities
function calculateStats(runClubActivities) {
    const totalRuns = runClubActivities.length;
    const totalDistanceMeters = runClubActivities.reduce((sum, act) => sum + (act.distance || 0), 0);
    const totalDistanceKm = totalDistanceMeters / 1000;
    const totalTimeSeconds = runClubActivities.reduce((sum, act) => sum + (act.moving_time || 0), 0);

    return {
        totalRuns,
        totalDistanceKm,
        totalTimeSeconds,
        avgDistanceKm: totalRuns > 0 ? totalDistanceKm / totalRuns : 0
    };
}

// Format seconds to HH:MM:SS
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Analyze activities
async function analyzeActivities(clubLat, clubLon, radiusKm) {
    showSection('loading');

    try {
        const accessToken = sessionStorage.getItem('access_token');

        if (!accessToken) {
            throw new Error('Not authenticated. Please log in again.');
        }

        // Fetch all activities
        const activities = await getStravaActivities(accessToken);

        // Filter for run club activities
        const runClubActivities = activities.filter(activity =>
            isRunClubActivity(activity, clubLat, clubLon, radiusKm)
        );

        // Calculate stats
        const stats = calculateStats(runClubActivities);

        // Display results
        displayResults(stats, runClubActivities);
        showSection('results');
    } catch (error) {
        showError(error.message);
    }
}

// Display results in the UI
function displayResults(stats, activities) {
    // Update stat cards
    document.getElementById('totalRunClubRuns').textContent = stats.totalRuns;
    document.getElementById('totalDistance').textContent = `${stats.totalDistanceKm.toFixed(2)} km`;
    document.getElementById('avgDistance').textContent = `${stats.avgDistanceKm.toFixed(2)} km`;
    document.getElementById('totalTime').textContent = formatTime(stats.totalTimeSeconds);

    // Display activities list
    const activitiesList = document.getElementById('activitiesList');
    activitiesList.innerHTML = '';

    if (activities.length === 0) {
        activitiesList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">No Run Club activities found matching the criteria.</p>';
        return;
    }

    // Sort by date (newest first) and show up to 20
    const sortedActivities = [...activities].sort((a, b) =>
        new Date(b.start_date_local) - new Date(a.start_date_local)
    ).slice(0, 20);

    sortedActivities.forEach(activity => {
        const date = new Date(activity.start_date_local);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const distanceKm = (activity.distance / 1000).toFixed(2);
        const time = formatTime(activity.moving_time);

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-info">
                <h4>${activity.name}</h4>
                <p>${formattedDate}</p>
            </div>
            <div class="activity-stats">
                <div class="activity-distance">${distanceKm} km</div>
                <div class="activity-time">${time}</div>
            </div>
        `;
        activitiesList.appendChild(activityItem);
    });
}

// Show error message
function showError(message) {
    document.getElementById('errorText').textContent = message;
    showSection('error');
}

// Show specific section and hide others
function showSection(section) {
    const sections = {
        login: loginSection,
        config: configSection,
        loading: loadingSection,
        results: resultsSection,
        error: errorSection
    };

    Object.values(sections).forEach(s => s.classList.add('hidden'));
    sections[section].classList.remove('hidden');
}

// Check if user is authenticated
function checkAuth() {
    const accessToken = sessionStorage.getItem('access_token');
    const expiresAt = sessionStorage.getItem('expires_at');

    if (accessToken && expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        if (now < parseInt(expiresAt)) {
            return true;
        } else {
            // Token expired
            logout();
            return false;
        }
    }
    return false;
}

// Logout
function logout() {
    sessionStorage.clear();
    showSection('login');
}

// Event listeners
connectBtn.addEventListener('click', () => {
    if (STRAVA_CONFIG.clientId === 'YOUR_STRAVA_CLIENT_ID') {
        showError('Please configure your Strava Client ID in app.js. See the deployment documentation for details.');
        return;
    }
    startAuth();
});

configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        showError('Please enter valid coordinates and radius.');
        return;
    }

    analyzeActivities(latitude, longitude, radius);
});

logoutBtn.addEventListener('click', logout);

analyzeAgainBtn.addEventListener('click', () => {
    showSection('config');
});

retryBtn.addEventListener('click', () => {
    showSection('login');
});

// Initialize app
async function init() {
    // Check for OAuth callback (token in hash for implicit grant)
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);

    if (hash.includes('access_token') || urlParams.has('error')) {
        await handleCallback();
        return;
    }

    // Check if already authenticated
    if (checkAuth()) {
        showSection('config');
    } else {
        showSection('login');
    }
}

// Start the app
init();
