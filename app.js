// Strava Run Club Tracker - Static Website Version
// OAuth configuration loaded from config.js
const STRAVA_CONFIG = {
    clientId: window.APP_CONFIG?.STRAVA_CLIENT_ID || 'YOUR_STRAVA_CLIENT_ID',
    clientSecret: window.APP_CONFIG?.STRAVA_CLIENT_SECRET || 'YOUR_STRAVA_CLIENT_SECRET',
    redirectUri: window.location.origin + window.location.pathname,
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    scope: 'activity:read'
};

// Profile definitions
const PROFILES = {
    cmrc: {
        name: 'Craft Metropolis Run Club',
        startLocation: {
            anywhere: true,
            lat: null,
            lon: null,
            radius: 0.5
        },
        finishLocation: {
            anywhere: false,
            lat: 51.417408,
            lon: -0.057741,
            radius: 0.5
        },
        dayOfWeek: 2, // Tuesday
        startTime: {
            any: true,
            time: null,
            window: null
        },
        endTime: {
            any: false,
            time: '19:30',
            window: 60
        }
    },
    crystalpalace: {
        name: 'Crystal Palace Parkrun',
        startLocation: {
            anywhere: false,
            lat: 51.41918253541567,
            lon: -0.0630248176967856,
            radius: 0.5
        },
        finishLocation: {
            anywhere: false,
            lat: 51.41918253541567,
            lon: -0.0630248176967856,
            radius: 0.5
        },
        dayOfWeek: 6, // Saturday
        startTime: {
            any: false,
            time: '09:00',
            window: 15
        },
        endTime: {
            any: true,
            time: null,
            window: null
        }
    },
    custom: {
        name: 'Custom',
        // Custom profile starts with empty/default values
        startLocation: {
            anywhere: false,
            lat: null,
            lon: null,
            radius: 0.5
        },
        finishLocation: {
            anywhere: false,
            lat: null,
            lon: null,
            radius: 0.5
        },
        dayOfWeek: 2, // Tuesday
        startTime: {
            any: false,
            time: '19:00',
            window: 15
        },
        endTime: {
            any: true,
            time: null,
            window: null
        }
    }
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

    // Build auth URL - using authorization code flow (Strava requirement)
    const params = new URLSearchParams({
        client_id: STRAVA_CONFIG.clientId,
        redirect_uri: STRAVA_CONFIG.redirectUri,
        response_type: 'code',
        scope: STRAVA_CONFIG.scope,
        state: state,
        approval_prompt: 'auto'
    });

    window.location.href = `${STRAVA_CONFIG.authUrl}?${params.toString()}`;
}

// OAuth: Handle callback and exchange code for token
async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
        showError(`Authentication failed: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (code && state) {
        const storedState = sessionStorage.getItem('oauth_state');

        if (state !== storedState) {
            showError('Invalid state parameter. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        try {
            // Exchange code for token using application/x-www-form-urlencoded
            const params = new URLSearchParams({
                client_id: STRAVA_CONFIG.clientId,
                client_secret: STRAVA_CONFIG.clientSecret,
                code: code,
                grant_type: 'authorization_code'
            });

            const response = await fetch(STRAVA_CONFIG.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
            }

            const data = await response.json();

            // Store access token
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('expires_at', data.expires_at);
            sessionStorage.setItem('refresh_token', data.refresh_token);
            if (data.athlete) {
                sessionStorage.setItem('athlete', JSON.stringify(data.athlete));
            }

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
function isRunClubActivity(activity, startLocation, finishLocation, dayOfWeek, startTime, endTime) {
    // Check if it's a run
    if (activity.type !== 'Run') {
        return false;
    }

    // Check start location (if specified)
    if (startLocation) {
        const startLatlng = activity.start_latlng;
        if (!startLatlng || startLatlng.length !== 2) {
            return false;
        }

        const [activityStartLat, activityStartLon] = startLatlng;
        const startDistanceKm = haversine(startLocation.lon, startLocation.lat, activityStartLon, activityStartLat);

        if (startDistanceKm > startLocation.radius) {
            return false;
        }
    }

    // Check finish location (if specified)
    if (finishLocation) {
        const endLatlng = activity.end_latlng;
        if (!endLatlng || endLatlng.length !== 2) {
            return false;
        }

        const [activityEndLat, activityEndLon] = endLatlng;
        const finishDistanceKm = haversine(finishLocation.lon, finishLocation.lat, activityEndLon, activityEndLat);

        if (finishDistanceKm > finishLocation.radius) {
            return false;
        }
    }

    // Check date/time - use local time
    const startDateLocal = activity.start_date_local;
    if (!startDateLocal) {
        return false;
    }

    try {
        // Parse ISO 8601 format
        // IMPORTANT: Strava's start_date_local is in the activity's local timezone
        // but may have a 'Z' suffix. We need to treat it as-is without timezone conversion.
        // Remove the 'Z' suffix if present to parse as local time
        const dateString = startDateLocal.replace('Z', '');
        const activityStartDate = new Date(dateString);

        // Check day of week (0 = Sunday, 1 = Monday, etc.)
        if (activityStartDate.getDay() !== dayOfWeek) {
            return false;
        }

        // Check start time (if specified)
        if (startTime && !startTime.any) {
            const [targetHours, targetMinutes] = startTime.time.split(':').map(Number);
            const targetTimeInMinutes = targetHours * 60 + targetMinutes;

            const minTime = targetTimeInMinutes - startTime.window;
            const maxTime = targetTimeInMinutes + startTime.window;

            const hours = activityStartDate.getHours();
            const minutes = activityStartDate.getMinutes();
            const totalMinutes = hours * 60 + minutes;

            if (totalMinutes < minTime || totalMinutes > maxTime) {
                return false;
            }
        }

        // Check end time (if specified)
        if (endTime && !endTime.any) {
            // Calculate activity end time by adding elapsed_time (in seconds) to start time
            const elapsedTimeSeconds = activity.elapsed_time;
            if (!elapsedTimeSeconds) {
                return false;
            }

            const activityEndDate = new Date(activityStartDate.getTime() + elapsedTimeSeconds * 1000);

            const [targetHours, targetMinutes] = endTime.time.split(':').map(Number);
            const targetTimeInMinutes = targetHours * 60 + targetMinutes;

            const minTime = targetTimeInMinutes - endTime.window;
            const maxTime = targetTimeInMinutes + endTime.window;

            const hours = activityEndDate.getHours();
            const minutes = activityEndDate.getMinutes();
            const totalMinutes = hours * 60 + minutes;

            if (totalMinutes < minTime || totalMinutes > maxTime) {
                return false;
            }
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
async function analyzeActivities(startLocation, finishLocation, dayOfWeek, startTime, endTime) {
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
            isRunClubActivity(activity, startLocation, finishLocation, dayOfWeek, startTime, endTime)
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

// Apply a profile to form fields
function applyProfile(profile) {
    // Start location
    document.getElementById('startAnywhere').checked = profile.startLocation.anywhere;
    document.getElementById('startLatitude').value = profile.startLocation.lat || '';
    document.getElementById('startLongitude').value = profile.startLocation.lon || '';
    document.getElementById('startRadius').value = profile.startLocation.radius;

    // Finish location
    document.getElementById('finishAnywhere').checked = profile.finishLocation.anywhere;
    document.getElementById('finishLatitude').value = profile.finishLocation.lat || '';
    document.getElementById('finishLongitude').value = profile.finishLocation.lon || '';
    document.getElementById('finishRadius').value = profile.finishLocation.radius;

    // Schedule
    document.getElementById('dayOfWeek').value = profile.dayOfWeek.toString();

    // Start time
    document.getElementById('startTimeAny').checked = profile.startTime.any;
    document.getElementById('startTime').value = profile.startTime.time || '';
    document.getElementById('startTimeWindow').value = profile.startTime.window || '';

    // End time
    document.getElementById('endTimeAny').checked = profile.endTime.any;
    document.getElementById('endTime').value = profile.endTime.time || '';
    document.getElementById('endTimeWindow').value = profile.endTime.window || '';

    // Update field states based on checkboxes
    toggleLocationFields('start', profile.startLocation.anywhere);
    toggleLocationFields('finish', profile.finishLocation.anywhere);
    toggleTimeFields('start', profile.startTime.any);
    toggleTimeFields('end', profile.endTime.any);
}

// Toggle location fields based on "anywhere" checkbox
function toggleLocationFields(type, isAnywhere) {
    const prefix = type; // 'start' or 'finish'
    const latField = document.getElementById(`${prefix}Latitude`);
    const lonField = document.getElementById(`${prefix}Longitude`);
    const radiusField = document.getElementById(`${prefix}Radius`);

    latField.disabled = isAnywhere;
    lonField.disabled = isAnywhere;
    radiusField.disabled = isAnywhere;

    // Remove required attribute when disabled
    if (isAnywhere) {
        latField.removeAttribute('required');
        lonField.removeAttribute('required');
        radiusField.removeAttribute('required');
    }
}

// Toggle time fields based on "any time" checkbox
function toggleTimeFields(type, isAnyTime) {
    const timeField = document.getElementById(`${type}Time`);
    const windowField = document.getElementById(`${type}TimeWindow`);

    timeField.disabled = isAnyTime;
    windowField.disabled = isAnyTime;

    // Remove required attribute when disabled
    if (isAnyTime) {
        timeField.removeAttribute('required');
        windowField.removeAttribute('required');
    }
}

// Event listeners
connectBtn.addEventListener('click', () => {
    if (STRAVA_CONFIG.clientSecret === 'YOUR_STRAVA_CLIENT_SECRET') {
        showError('Please configure your Strava credentials in config.js. See CONFIG.md for details.');
        return;
    }
    startAuth();
});

configForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get start location
    const startAnywhere = document.getElementById('startAnywhere').checked;
    const startLat = parseFloat(document.getElementById('startLatitude').value);
    const startLon = parseFloat(document.getElementById('startLongitude').value);
    const startRadius = parseFloat(document.getElementById('startRadius').value);

    // Get finish location
    const finishAnywhere = document.getElementById('finishAnywhere').checked;
    const finishLat = parseFloat(document.getElementById('finishLatitude').value);
    const finishLon = parseFloat(document.getElementById('finishLongitude').value);
    const finishRadius = parseFloat(document.getElementById('finishRadius').value);

    // Get schedule
    const dayOfWeek = parseInt(document.getElementById('dayOfWeek').value);

    // Get start time
    const startTimeAny = document.getElementById('startTimeAny').checked;
    const startTimeValue = document.getElementById('startTime').value;
    const startTimeWindowValue = parseInt(document.getElementById('startTimeWindow').value);

    // Get end time
    const endTimeAny = document.getElementById('endTimeAny').checked;
    const endTimeValue = document.getElementById('endTime').value;
    const endTimeWindowValue = parseInt(document.getElementById('endTimeWindow').value);

    // Validate start location (if not "anywhere")
    if (!startAnywhere && (isNaN(startLat) || isNaN(startLon) || isNaN(startRadius))) {
        showError('Please enter valid start location coordinates and radius, or check "Anywhere".');
        return;
    }

    // Validate finish location (if not "anywhere")
    if (!finishAnywhere && (isNaN(finishLat) || isNaN(finishLon) || isNaN(finishRadius))) {
        showError('Please enter valid finish location coordinates and radius, or check "Anywhere".');
        return;
    }

    // Validate day of week
    if (isNaN(dayOfWeek)) {
        showError('Please select a valid day of week.');
        return;
    }

    // Validate start time (if not "any")
    if (!startTimeAny && (!startTimeValue || isNaN(startTimeWindowValue))) {
        showError('Please enter valid start time and time window, or check "Any time".');
        return;
    }

    // Validate end time (if not "any")
    if (!endTimeAny && (!endTimeValue || isNaN(endTimeWindowValue))) {
        showError('Please enter valid end time and time window, or check "Any time".');
        return;
    }

    // Validate that at least one time constraint is set
    if (startTimeAny && endTimeAny) {
        showError('Please specify at least one time constraint (start time or end time).');
        return;
    }

    // Package location data
    const startLocation = startAnywhere ? null : { lat: startLat, lon: startLon, radius: startRadius };
    const finishLocation = finishAnywhere ? null : { lat: finishLat, lon: finishLon, radius: finishRadius };

    // Package time data
    const startTime = startTimeAny ? { any: true } : { any: false, time: startTimeValue, window: startTimeWindowValue };
    const endTime = endTimeAny ? { any: true } : { any: false, time: endTimeValue, window: endTimeWindowValue };

    analyzeActivities(startLocation, finishLocation, dayOfWeek, startTime, endTime);
});

logoutBtn.addEventListener('click', logout);

analyzeAgainBtn.addEventListener('click', () => {
    showSection('config');
});

retryBtn.addEventListener('click', () => {
    showSection('login');
});

// Start location "anywhere" checkbox handler
const startAnywhereCheckbox = document.getElementById('startAnywhere');
startAnywhereCheckbox.addEventListener('change', (e) => {
    toggleLocationFields('start', e.target.checked);
});

// Finish location "anywhere" checkbox handler
const finishAnywhereCheckbox = document.getElementById('finishAnywhere');
finishAnywhereCheckbox.addEventListener('change', (e) => {
    toggleLocationFields('finish', e.target.checked);
});

// Start time "any time" checkbox handler
const startTimeAnyCheckbox = document.getElementById('startTimeAny');
startTimeAnyCheckbox.addEventListener('change', (e) => {
    toggleTimeFields('start', e.target.checked);
});

// End time "any time" checkbox handler
const endTimeAnyCheckbox = document.getElementById('endTimeAny');
endTimeAnyCheckbox.addEventListener('change', (e) => {
    toggleTimeFields('end', e.target.checked);
});

// Profile selector handler
const profileSelect = document.getElementById('profileSelect');
profileSelect.addEventListener('change', (e) => {
    const selectedProfileKey = e.target.value;
    const profile = PROFILES[selectedProfileKey];
    if (profile) {
        applyProfile(profile);
    }
});

// Initialize app
async function init() {
    // Initialize with selected profile (defaults to CMRC)
    const selectedProfileKey = profileSelect.value;
    const profile = PROFILES[selectedProfileKey];
    if (profile) {
        applyProfile(profile);
    }

    // Check for OAuth callback (code in query params for authorization code flow)
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('code') || urlParams.has('error')) {
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
