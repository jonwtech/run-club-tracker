# Adding New Run Club Profiles

This guide explains how to add new run club profiles to the Run Club Tracker.

## What is a Profile?

A profile is a pre-configured set of filters for a specific run club, including:
- Start location (with optional "anywhere" setting)
- Finish location (with optional "anywhere" setting)
- Day of week
- Start time and time window

Profiles make it easy for users to quickly configure the tracker for their run club without manually entering all the details.

## How to Add a New Profile

### Step 1: Define the Profile in `app.js`

Open `app.js` and locate the `PROFILES` constant (around line 12-50). Add your new profile to this object:

```javascript
const PROFILES = {
    cmrc: {
        // ... existing CMRC profile ...
    },
    custom: {
        // ... existing Custom profile ...
    },
    // Add your new profile here:
    yourProfileKey: {
        name: 'Your Run Club Name',
        startLocation: {
            anywhere: false,              // true = ignore start location, false = filter by location
            lat: 51.5074,                 // Latitude (null if anywhere = true)
            lon: -0.1278,                 // Longitude (null if anywhere = true)
            radius: 0.5                   // Search radius in kilometers
        },
        finishLocation: {
            anywhere: false,              // true = ignore finish location
            lat: 51.5074,                 // Latitude (null if anywhere = true)
            lon: -0.1278,                 // Longitude (null if anywhere = true)
            radius: 0.5                   // Search radius in kilometers
        },
        dayOfWeek: 2,                     // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
        startTime: {
            any: false,                   // true = ignore start time, false = filter by start time
            time: '19:00',                // 24-hour format (HH:MM), null if any = true
            window: 15                    // Minutes +/- from start time, null if any = true
        },
        endTime: {
            any: true,                    // true = ignore end time, false = filter by end time
            time: null,                   // 24-hour format (HH:MM), null if any = true
            window: null                  // Minutes +/- from end time, null if any = true
        }
    }
};
```

### Step 2: Add Profile to Dropdown in `index.html`

Open `index.html` and locate the `profileSelect` dropdown (around line 30-35). Add a new option:

```html
<select id="profileSelect" required>
    <option value="cmrc" selected>Craft Metropolis Run Club</option>
    <option value="yourProfileKey">Your Run Club Name</option>
    <option value="custom">Custom</option>
</select>
```

**Important**: The `value` attribute must match the key you used in the PROFILES object.

## Profile Field Reference

### Profile Keys
- Use lowercase, no spaces (e.g., `cmrc`, `parkrun`, `londonrunners`)
- Keep it short and descriptive

### Profile Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name for the run club |
| `startLocation` | Object | Starting location configuration |
| `finishLocation` | Object | Finishing location configuration |
| `dayOfWeek` | Number | Day of the week (0-6) |
| `startTime` | Object | Start time configuration (see Time Object below) |
| `endTime` | Object | End time configuration (see Time Object below) |

### Location Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `anywhere` | Boolean | If `true`, location filtering is skipped |
| `lat` | Number/null | Latitude in decimal degrees (null if anywhere = true) |
| `lon` | Number/null | Longitude in decimal degrees (null if anywhere = true) |
| `radius` | Number | Search radius in kilometers |

### Time Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `any` | Boolean | If `true`, time filtering is skipped for this constraint |
| `time` | String/null | Time in HH:MM format (24-hour), null if any = true |
| `window` | Number/null | Minutes +/- from the specified time, null if any = true |

**Note**: At least one time constraint (startTime or endTime) must be specified (i.e., not "any").

### Day of Week Values

| Value | Day |
|-------|-----|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

## Common Profile Patterns

### Pattern 1: Traditional Run Club
Same start and finish location, specific start time:

```javascript
traditionalclub: {
    name: 'Traditional Run Club',
    startLocation: {
        anywhere: false,
        lat: 51.5074,
        lon: -0.1278,
        radius: 0.5
    },
    finishLocation: {
        anywhere: false,
        lat: 51.5074,           // Same as start
        lon: -0.1278,           // Same as start
        radius: 0.5
    },
    dayOfWeek: 3,               // Wednesday
    startTime: {
        any: false,
        time: '18:30',
        window: 15
    },
    endTime: {
        any: true,              // Any end time
        time: null,
        window: null
    }
}
```

### Pattern 2: Pub Run
Start anywhere, finish at specific location and end time:

```javascript
pubrun: {
    name: 'Pub Run Club',
    startLocation: {
        anywhere: true,         // Can start anywhere
        lat: null,
        lon: null,
        radius: 0.5
    },
    finishLocation: {
        anywhere: false,        // Must finish at pub
        lat: 51.5074,
        lon: -0.1278,
        radius: 0.5
    },
    dayOfWeek: 4,               // Thursday
    startTime: {
        any: true,              // Can start any time
        time: null,
        window: null
    },
    endTime: {
        any: false,             // Must finish around 7:30pm
        time: '19:30',
        window: 60              // Wide window for social runs
    }
}
```

### Pattern 3: Parkrun
Fixed location, Saturday morning:

```javascript
parkrun: {
    name: 'Local Parkrun',
    startLocation: {
        anywhere: false,
        lat: 51.5074,
        lon: -0.1278,
        radius: 0.5
    },
    finishLocation: {
        anywhere: false,
        lat: 51.5074,           // Same location as start
        lon: -0.1278,
        radius: 0.5
    },
    dayOfWeek: 6,               // Saturday
    startTime: {
        any: false,
        time: '09:00',
        window: 15
    },
    endTime: {
        any: true,              // Any end time
        time: null,
        window: null
    }
}
```

### Pattern 4: Social Run (Flexible)
Any location, flexible start time, specific day:

```javascript
socialrun: {
    name: 'Social Sunday Run',
    startLocation: {
        anywhere: true,
        lat: null,
        lon: null,
        radius: 0.5
    },
    finishLocation: {
        anywhere: true,
        lat: null,
        lon: null,
        radius: 0.5
    },
    dayOfWeek: 0,               // Sunday
    startTime: {
        any: false,
        time: '10:00',
        window: 30              // Wider window for social runs
    },
    endTime: {
        any: true,              // Any end time
        time: null,
        window: null
    }
}
```

## Finding GPS Coordinates

To find the latitude and longitude for your run club location:

### Method 1: Google Maps
1. Open [Google Maps](https://maps.google.com)
2. Right-click on the location
3. Click on the coordinates (first item in menu)
4. Coordinates are copied to clipboard in format: `lat, lon`

### Method 2: Strava
1. Find a run that started/finished at your club location
2. Click on the activity
3. Look at the URL: `strava.com/activities/12345/overview`
4. The map shows the route - you can see coordinates in the activity details

### Method 3: Other Tools
- [LatLong.net](https://www.latlong.net/)
- [GPS Coordinates](https://gps-coordinates.org/)

## Testing Your Profile

After adding a new profile:

1. **Local Testing**:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

2. **Check the Profile**:
   - Select your profile from the dropdown
   - Verify all fields are populated correctly
   - Check that "Anywhere" checkboxes are set correctly
   - Verify disabled/enabled fields match your expectations

3. **Test Filtering**:
   - Connect with Strava
   - Run an analysis
   - Verify activities are filtered correctly

## Deployment

After adding and testing your profile:

1. **Commit your changes**:
   ```bash
   git add app.js index.html
   git commit -m "Add [Your Club Name] profile"
   git push
   ```

2. **For GitHub Pages**:
   - Changes will deploy automatically
   - Wait 1-2 minutes for deployment

3. **For S3 or other hosting**:
   - Follow your normal deployment process

## Contributing Profiles

If you'd like to contribute a profile for a public run club:

1. Fork the repository
2. Add your profile following this guide
3. Create a pull request with:
   - Profile definition
   - Dropdown option
   - Description of the run club
   - Why this profile would be useful to others

We welcome contributions for:
- Popular run clubs
- Regional run groups
- Parkruns
- Charity runs
- Any recurring running events

## Troubleshooting

### Profile Not Appearing in Dropdown
- Check that the `value` in the `<option>` tag matches the key in PROFILES
- Clear your browser cache
- Check browser console for JavaScript errors

### Fields Not Populating Correctly
- Verify all profile fields are spelled correctly
- Check that lat/lon are numbers (not strings)
- Ensure dayOfWeek is a number (0-6)
- Verify startTime is in HH:MM format

### Wrong Activities Being Filtered
- Double-check GPS coordinates (lat/lon might be swapped)
- Verify radius is appropriate (too small = no matches, too large = false matches)
- Check dayOfWeek value (remember: 0 = Sunday)
- Verify time window is appropriate for your club

## Example: Complete Profile Addition

Here's a complete example of adding a "Friday Night Lights" running club:

**1. Add to app.js (PROFILES object):**
```javascript
fnl: {
    name: 'Friday Night Lights',
    startLocation: {
        anywhere: false,
        lat: 51.4545,
        lon: -0.0545,
        radius: 0.3
    },
    finishLocation: {
        anywhere: false,
        lat: 51.4545,
        lon: -0.0545,
        radius: 0.3
    },
    dayOfWeek: 5,           // Friday
    startTime: {
        any: false,
        time: '19:30',
        window: 10          // Stricter time window
    },
    endTime: {
        any: true,
        time: null,
        window: null
    }
}
```

**2. Add to index.html (profileSelect dropdown):**
```html
<select id="profileSelect" required>
    <option value="cmrc" selected>Craft Metropolis Run Club</option>
    <option value="fnl">Friday Night Lights</option>
    <option value="custom">Custom</option>
</select>
```

**3. Test and deploy!**

## Questions or Issues?

If you encounter any issues or have questions about adding profiles:
- Check existing profiles in `app.js` for reference
- Review this documentation
- Open an issue on GitHub with details about your profile
