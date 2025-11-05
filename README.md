# Strava Run Club Tracker

Track your run club participation by counting runs that started from a specific location on Tuesdays at 7pm.

## Features

- Fetches all your activities from Strava
- Filters for runs that match Run Club criteria:
  - Type: Run
  - Day: Tuesday
  - Time: 6:45pm - 7:15pm (local time)
  - Location: Within configurable distance from club start location
- Displays statistics:
  - Total number of Run Club runs
  - Total kilometers ran
  - Total time
  - Average distance and pace
  - List of recent Run Club runs

## Setup

### 1. Install Dependencies

```bash
pip install requests
```

### 2. Get a Strava API Access Token

1. Go to https://www.strava.com/settings/api
2. Create an application (if you haven't already)
3. Note your Client ID and Client Secret
4. Get an access token with `activity:read` scope

**Quick way to get an access token:**

Visit this URL in your browser (replace `YOUR_CLIENT_ID` with your actual Client ID):

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read
```

After authorizing, you'll be redirected to a URL like:
```
http://localhost/?state=&code=AUTHORIZATION_CODE&scope=read,activity:read
```

Copy the `AUTHORIZATION_CODE` and exchange it for an access token:

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=AUTHORIZATION_CODE \
  -d grant_type=authorization_code
```

The response will include an `access_token` field.

### 3. Find Your Run Club Location Coordinates

1. Go to Google Maps
2. Right-click on your Run Club starting location
3. Click on the coordinates to copy them
4. Format: Latitude, Longitude (e.g., 40.7128, -74.0060)

## Usage

Run the script:

```bash
python run_club_tracker.py
```

You'll be prompted for:
- Strava API Access Token
- Run Club latitude
- Run Club longitude
- Maximum distance from start location (default 0.5 km)

## Example Output

```
============================================================
Strava Run Club Tracker
============================================================

Enter your Strava API Access Token: ****
Enter Run Club starting location coordinates:
  Latitude: 40.7128
  Longitude: -74.0060
Maximum distance from start location in km (default 0.5): 0.5

Fetching activities from Strava...
Retrieved 245 total activities

Filtering for Run Club activities...

============================================================
RUN CLUB STATISTICS
============================================================

Total Run Club Runs: 42
Total Run Club Kilometers: 252.50 km
Total Time: 21.30 hours
Average Distance: 6.01 km
Average Pace: 5.06 min/km

Recent Run Club activities:
------------------------------------------------------------
  2025-01-28 - Tuesday Night Run (6.20 km)
  2025-01-21 - Run Club (5.85 km)
  2025-01-14 - Evening Run (6.40 km)
  ...
```

## Notes

- The script uses the Haversine formula to calculate distance between coordinates
- Local time is used for time filtering (based on activity's timezone)
- Adjust the maximum distance parameter if your run club has flexibility in start location
