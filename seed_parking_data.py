"""
seed_parking_data.py

Generates realistic fake parking data and inserts it into PostgreSQL.
This script resets local parking lots and parking events before reseeding,
so it can be safely rerun for a fresh 30-day local dataset.

Usage:
    pip install psycopg2-binary faker
    python seed_parking_data.py

Configure your DB connection in the CONFIG block below.
Run seed_users.py first to populate users.
"""

import random
import os
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from faker import Faker
from dotenv import load_dotenv

fake = Faker()
load_dotenv()

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "dbname":   os.getenv("DB_NAME", "ParkPerfect"),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
}
# How many days of history to generate
DAYS_OF_HISTORY = 30

# ─── PARKING LOTS ────────────────────────────────────────────────────────────

LOTS = [
    {"name": "Kelley Center",    "latitude": 41.160659, "longitude": -73.258419, "totalSpaces": 20,  "catalogID": 1},
    {"name": "Jogues Lot",       "latitude": 41.161822, "longitude": -73.261176, "totalSpaces": 100, "catalogID": 1},
    {"name": "Bowman Lot",       "latitude": 41.160318, "longitude": -73.261309, "totalSpaces": 50,  "catalogID": 1},
    {"name": "Canisius Lot",     "latitude": 41.159295, "longitude": -73.259940, "totalSpaces": 100, "catalogID": 1},
    {"name": "Bellarmine Lot",   "latitude": 41.157767, "longitude": -73.259656, "totalSpaces": 30,  "catalogID": 1},
    {"name": "Barnyard Lot",     "latitude": 41.153995, "longitude": -73.257876, "totalSpaces": 55,  "catalogID": 1},
    {"name": "Media Center Lot", "latitude": 41.153405, "longitude": -73.255982, "totalSpaces": 28,  "catalogID": 1},
    {"name": "Faber Lot",        "latitude": 41.155460, "longitude": -73.254132, "totalSpaces": 59,  "catalogID": 1},
    {"name": "Mahan Lot",        "latitude": 41.157496, "longitude": -73.253312, "totalSpaces": 22,  "catalogID": 1},
    {"name": "Egan Lot",         "latitude": 41.159402, "longitude": -73.256080, "totalSpaces": 200, "catalogID": 1},
    {"name": "Parking garage",   "latitude": 41.160861, "longitude": -73.257028, "totalSpaces": 200, "catalogID": 1},
    {"name": "Mccorminck Lot",   "latitude": 41.161456, "longitude": -73.259210, "totalSpaces": 150, "catalogID": 1},
]

# ─── REALISTIC OCCUPANCY CURVE ───────────────────────────────────────────────

def target_occupancy(hour: int, weekday: int) -> float:
    is_weekend = weekday >= 5

    if is_weekend:
        curve = {
            0: 0.05, 1: 0.03, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.03,
            6: 0.08, 7: 0.15, 8: 0.25, 9: 0.40, 10: 0.55, 11: 0.65,
            12: 0.75, 13: 0.80, 14: 0.82, 15: 0.80, 16: 0.75, 17: 0.70,
            18: 0.65, 19: 0.55, 20: 0.40, 21: 0.25, 22: 0.15, 23: 0.08,
        }
    else:
        curve = {
            0: 0.03, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.03, 5: 0.08,
            6: 0.25, 7: 0.55, 8: 0.80, 9: 0.85, 10: 0.82, 11: 0.78,
            12: 0.65, 13: 0.72, 14: 0.78, 15: 0.75, 16: 0.60, 17: 0.40,
            18: 0.25, 19: 0.15, 20: 0.10, 21: 0.07, 22: 0.05, 23: 0.03,
        }

    base = curve[hour]
    return max(0.0, min(1.0, base + random.uniform(-0.08, 0.08)))


# ─── EVENT GENERATOR ─────────────────────────────────────────────────────────

def generate_events(lot_db_id: int, total_spaces: int,
                    user_ids: list, start_dt: datetime, end_dt: datetime):
    events = []
    current_occupied = set()

    dt = start_dt.replace(minute=0, second=0, microsecond=0)

    while dt < end_dt:
        hour    = dt.hour
        weekday = dt.weekday()

        target       = target_occupancy(hour, weekday)
        target_count = int(total_spaces * target)
        currently_in = len(current_occupied)
        delta        = target_count - currently_in

        if delta > 0:
            arrivals = delta + random.randint(0, max(1, delta // 4))
            available = [u for u in user_ids if u not in current_occupied]
            random.shuffle(available)
            for user_id in available[:arrivals]:
                ts = dt.replace(minute=random.randint(0, 59), second=random.randint(0, 59))
                events.append((user_id, lot_db_id, "PARKED", ts))
                current_occupied.add(user_id)

        elif delta < 0:
            departures = abs(delta) + random.randint(0, max(1, abs(delta) // 4))
            leaving = random.sample(sorted(current_occupied), min(departures, len(current_occupied)))
            for user_id in leaving:
                ts = dt.replace(minute=random.randint(0, 59), second=random.randint(0, 59))
                events.append((user_id, lot_db_id, "LEFT", ts))
                current_occupied.discard(user_id)

        # Organic churn
        churn = random.randint(0, max(1, len(current_occupied) // 10))
        churning_out = random.sample(sorted(current_occupied), min(churn, len(current_occupied)))
        for user_id in churning_out:
            ts = dt.replace(minute=random.randint(0, 59), second=random.randint(0, 59))
            events.append((user_id, lot_db_id, "LEFT", ts))
            current_occupied.discard(user_id)

            available = [u for u in user_ids if u not in current_occupied]
            if available:
                new_user = random.choice(available)
                ts2 = ts + timedelta(minutes=random.randint(1, 15))
                if ts2.hour == hour:
                    events.append((new_user, lot_db_id, "PARKED", ts2))
                    current_occupied.add(new_user)

        dt += timedelta(hours=1)

    return events


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()
    print("Connected to PostgreSQL.")

    # ── 1. Insert parking lots ────────────────────────────────────────────────
    print("Clearing existing parking events and lots...")
    cur.execute('DELETE FROM parking_parkingevent')
    cur.execute('DELETE FROM parking_parkinglot')
    conn.commit()

    print("Inserting parking lots...")
    lot_ids = []
    for lot in LOTS:
        cur.execute("""
            INSERT INTO parking_parkinglot
                ("name", latitude, longitude, "totalSpaces", "availableSpaces", "catalogID")
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING "lotID"
        """, (
            lot["name"],
            lot["latitude"],
            lot["longitude"],
            lot["totalSpaces"],
            lot["totalSpaces"],
            lot["catalogID"],
        ))
        lot_id = cur.fetchone()[0]
        lot_ids.append((lot_id, lot["totalSpaces"]))
        print(f"  -> Lot '{lot['name']}' inserted with ID {lot_id}")

    conn.commit()

    # ── 2. Fetch real user IDs ────────────────────────────────────────────────
    cur.execute('SELECT "userID" FROM users_user ORDER BY "userID"')
    user_ids = [row[0] for row in cur.fetchall()]

    if not user_ids:
        print("\nNo users found in users_user. Run seed_users.py first.")
        conn.close()
        return

    print(f"\nFound {len(user_ids)} user(s) to spread events across.")

    # ── 3. Generate + insert events ───────────────────────────────────────────
    end_dt   = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_dt = end_dt - timedelta(days=DAYS_OF_HISTORY)

    for lot_id, total_spaces in lot_ids:
        print(f"\nGenerating events for lot {lot_id} ({total_spaces} spaces)...")
        events = generate_events(lot_id, total_spaces, user_ids, start_dt, end_dt)
        events.sort(key=lambda e: e[3])

        print(f"  Inserting {len(events):,} events...")
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO parking_parkingevent
                (user_id, lot_id, "eventType", "timestamp")
            VALUES %s
            """,
            [(u, l, t, ts) for u, l, t, ts in events],
            page_size=500,
        )
        conn.commit()

        # ── 4. Update availableSpaces ─────────────────────────────────────────
        parked_count = sum(1 for _, _, etype, _ in events if etype == "PARKED")
        left_count   = sum(1 for _, _, etype, _ in events if etype == "LEFT")
        net_parked   = max(0, parked_count - left_count)
        available    = max(0, total_spaces - net_parked)

        cur.execute(
            'UPDATE parking_parkinglot SET "availableSpaces" = %s WHERE "lotID" = %s',
            (available, lot_id)
        )
        conn.commit()
        print(f"  -> availableSpaces updated to {available}")

    print("\nSeed complete!")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
