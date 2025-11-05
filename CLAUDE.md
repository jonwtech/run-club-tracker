# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python CLI tool that tracks run club participation by analyzing Strava activities. It filters runs based on specific criteria (day, time, and location) to count "Run Club" runs.

## Running the Tool

```bash
# Install dependencies
pip install -r requirements.txt

# Run the tool (interactive)
python run_club_tracker.py

# Run with debug output (shows API responses and filtering details)
python run_club_tracker.py --debug
```

## Architecture

The tool is a single-file Python script with four main components:

1. **API Integration** (`get_strava_activities`): Fetches all activities from Strava API with pagination, requires `activity:read` scope
2. **Filtering Logic** (`is_run_club_activity`): Multi-criteria filtering that checks ALL of:
   - Activity type must be "Run"
   - Day must be Tuesday (weekday 1)
   - Time must be 18:45-19:15 local time
   - Location must be within configurable distance (default 0.5km) from club coordinates using Haversine formula
3. **Statistics Calculation** (`calculate_stats`): Computes totals and averages
4. **User Interface** (`main`): Interactive prompts for access token and coordinates

## Key Implementation Details

- **Time filtering**: Uses `start_date_local` from Strava API (not UTC) to respect activity timezone
- **Location filtering**: Haversine formula calculates great circle distance between GPS coordinates
- **Debug mode**: Pass `--debug` flag to see raw API responses and detailed filtering output for each activity
- **Strava API**: Uses `/athlete/activities` endpoint with pagination (200 activities per page)

## Strava API Authentication

Users need an access token with `activity:read` scope (not just general `read` scope). See README.md for OAuth flow details.
