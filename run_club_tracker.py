#!/usr/bin/env python3
"""
Strava Run Club Tracker
Tracks runs that start from a specific location on Tuesdays at 7pm (+/- 15 minutes)
"""

import requests
import sys
import json
import argparse
from datetime import datetime, time
from math import radians, cos, sin, asin, sqrt
from typing import List, Dict, Optional


def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r


def get_strava_activities(access_token: str, per_page: int = 200, debug: bool = False) -> List[Dict]:
    """Fetch all activities from Strava API"""
    activities = []
    page = 1

    while True:
        url = "https://www.strava.com/api/v3/athlete/activities"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"per_page": per_page, "page": page}

        if debug:
            print(f"\n[DEBUG] Fetching page {page}...")
            print(f"[DEBUG] URL: {url}")
            print(f"[DEBUG] Params: {params}")

        response = requests.get(url, headers=headers, params=params)

        if debug:
            print(f"[DEBUG] Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"Error fetching activities: {response.status_code}")
            print(response.text)
            sys.exit(1)

        batch = response.json()

        if debug:
            print(f"[DEBUG] Received {len(batch)} activities")
            if batch:
                print(f"[DEBUG] First activity sample:")
                print(json.dumps(batch[0], indent=2))

        if not batch:
            break

        activities.extend(batch)
        page += 1

    return activities


def is_run_club_activity(
    activity: Dict,
    club_lat: float,
    club_lon: float,
    max_distance_km: float = 0.5,
    debug: bool = False
) -> bool:
    """
    Check if an activity qualifies as a Run Club run.
    Criteria:
    - Type is "Run"
    - Started on a Tuesday
    - Started between 6:45pm and 7:15pm local time
    - Started within max_distance_km of the club location
    """
    if debug:
        print(f"\n[DEBUG] Checking activity: {activity.get('name', 'Unnamed')}")
        print(f"[DEBUG] Type: {activity.get('type')}")
        print(f"[DEBUG] Start date: {activity.get('start_date_local')}")
        print(f"[DEBUG] Start location: {activity.get('start_latlng')}")

    # Check if it's a run
    if activity.get("type") != "Run":
        if debug:
            print(f"[DEBUG] ✗ Not a run")
        return False

    # Check start location
    start_latlng = activity.get("start_latlng")
    if not start_latlng or len(start_latlng) != 2:
        if debug:
            print(f"[DEBUG] ✗ No start location")
        return False

    start_lat, start_lon = start_latlng
    distance_km = haversine(club_lon, club_lat, start_lon, start_lat)

    if debug:
        print(f"[DEBUG] Distance from club: {distance_km:.2f} km (max: {max_distance_km} km)")

    if distance_km > max_distance_km:
        if debug:
            print(f"[DEBUG] ✗ Too far from club location")
        return False

    # Check time - use local time
    start_date_local = activity.get("start_date_local")
    if not start_date_local:
        if debug:
            print(f"[DEBUG] ✗ No start date")
        return False

    try:
        # Parse ISO 8601 format: 2023-01-01T19:00:00Z
        dt = datetime.fromisoformat(start_date_local.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        if debug:
            print(f"[DEBUG] ✗ Invalid date format")
        return False

    # Check if Tuesday (weekday 1)
    weekday_name = dt.strftime("%A")
    if debug:
        print(f"[DEBUG] Day of week: {weekday_name}")

    if dt.weekday() != 1:
        if debug:
            print(f"[DEBUG] ✗ Not a Tuesday")
        return False

    # Check if between 6:45pm (18:45) and 7:15pm (19:15)
    start_time = dt.time()
    min_time = time(18, 45)
    max_time = time(19, 15)

    if debug:
        print(f"[DEBUG] Start time: {start_time} (window: 18:45-19:15)")

    if not (min_time <= start_time <= max_time):
        if debug:
            print(f"[DEBUG] ✗ Outside time window")
        return False

    if debug:
        print(f"[DEBUG] ✓ MATCHES all criteria!")

    return True


def calculate_stats(run_club_activities: List[Dict]) -> Dict:
    """Calculate statistics for run club activities"""
    total_runs = len(run_club_activities)
    total_distance_meters = sum(activity.get("distance", 0) for activity in run_club_activities)
    total_distance_km = total_distance_meters / 1000
    total_time_seconds = sum(activity.get("moving_time", 0) for activity in run_club_activities)
    total_time_hours = total_time_seconds / 3600

    return {
        "total_runs": total_runs,
        "total_distance_km": total_distance_km,
        "total_time_hours": total_time_hours,
        "avg_distance_km": total_distance_km / total_runs if total_runs > 0 else 0,
        "avg_pace_min_per_km": (total_time_seconds / 60) / total_distance_km if total_distance_km > 0 else 0
    }


def main():
    """Main function to run the Run Club tracker"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Strava Run Club Tracker")
    parser.add_argument("--debug", action="store_true", help="Enable debug output showing raw API data and filtering details")
    args = parser.parse_args()

    print("=" * 60)
    print("Strava Run Club Tracker")
    print("=" * 60)
    print()

    if args.debug:
        print("[DEBUG MODE ENABLED]\n")

    # Get user inputs
    access_token = input("Enter your Strava API Access Token: ").strip()
    if not access_token:
        print("Error: Access token is required")
        sys.exit(1)

    print()
    print("Enter Run Club starting location coordinates:")
    try:
        club_lat = float(input("  Latitude: ").strip())
        club_lon = float(input("  Longitude: ").strip())
    except ValueError:
        print("Error: Invalid coordinates")
        sys.exit(1)

    print()
    max_distance = input("Maximum distance from start location in km (default 0.5): ").strip()
    max_distance_km = float(max_distance) if max_distance else 0.5

    print()
    print("Fetching activities from Strava...")
    activities = get_strava_activities(access_token, debug=args.debug)
    print(f"Retrieved {len(activities)} total activities")

    print()
    print("Filtering for Run Club activities...")
    run_club_activities = [
        activity for activity in activities
        if is_run_club_activity(activity, club_lat, club_lon, max_distance_km, debug=args.debug)
    ]

    print()
    print("=" * 60)
    print("RUN CLUB STATISTICS")
    print("=" * 60)

    if not run_club_activities:
        print("No Run Club activities found matching the criteria.")
        return

    stats = calculate_stats(run_club_activities)

    print(f"\nTotal Run Club Runs: {stats['total_runs']}")
    print(f"Total Run Club Kilometers: {stats['total_distance_km']:.2f} km")
    print(f"Total Time: {stats['total_time_hours']:.2f} hours")
    print(f"Average Distance: {stats['avg_distance_km']:.2f} km")
    print(f"Average Pace: {stats['avg_pace_min_per_km']:.2f} min/km")

    print()
    print("Recent Run Club activities:")
    print("-" * 60)
    for activity in sorted(run_club_activities, key=lambda x: x.get('start_date_local', ''), reverse=True)[:10]:
        date = activity.get('start_date_local', 'Unknown')[:10]
        name = activity.get('name', 'Unnamed')
        distance = activity.get('distance', 0) / 1000
        print(f"  {date} - {name} ({distance:.2f} km)")

    print()


if __name__ == "__main__":
    main()
