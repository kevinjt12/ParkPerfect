"""
seed_users.py

Generates realistic fake users compatible with the custom User model:
  - Primary key: user_id (AutoField)
  - Login field: email (unique)
  - Name fields: first_name, last_name
  - No username column
  - Also seeds Vehicle records for each user

Usage:
    pip install psycopg2-binary faker
    python seed_users.py

Fill in your DB credentials below (copy from settings.py DATABASES block).
"""

import random
import hashlib
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "dbname":   "ParkPerfect",
    "user":     "postgres",
    "password": "Fairfieldcom25!",
    "host":     "localhost",
    "port":     5433,
}

USER_TABLE    = "users_user"
VEHICLE_TABLE = "users_vehicle"
 
NUM_USERS = 50
 
VEHICLE_CHANCE        = 0.85
SECOND_VEHICLE_CHANCE = 0.20
 
US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]
 
# ─── HELPERS ─────────────────────────────────────────────────────────────────
 
def make_unusable_password():
    return "!" + hashlib.sha256(fake.uuid4().encode()).hexdigest()
 
def fake_license_plate():
    letters = fake.lexify("???").upper()
    digits  = fake.numerify("####")
    return f"{letters}-{digits}"
 
# ─── MAIN ────────────────────────────────────────────────────────────────────
 
def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()
    print(f"Connected. Inserting up to {NUM_USERS} users into '{USER_TABLE}'...\n")
 
    # Avoid duplicate emails
    cur.execute(f'SELECT email FROM {USER_TABLE}')
    used_emails = {row[0] for row in cur.fetchall()}
 
    users = []
    attempts = 0
 
    while len(users) < NUM_USERS and attempts < NUM_USERS * 10:
        attempts += 1
 
        first_name = fake.first_name()
        last_name  = fake.last_name()
        email      = f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@{fake.free_email_domain()}"
 
        if email in used_emails:
            continue
 
        used_emails.add(email)
        users.append((
            first_name,
            last_name,
            email,
            make_unusable_password(),
            False,  # is_staff
            False,  # is_superuser
            True,   # is_active
        ))
 
    if not users:
        print("No users to insert.")
        conn.close()
        return
 
    # Insert one by one so we can capture each returned user_id reliably
    inserted_users = []  # [(user_id, email), ...]
    for u in users:
        cur.execute(
            f"""
            INSERT INTO {USER_TABLE}
                ("firstName", "lastName", email, password, is_staff, is_superuser, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING "userID", email
            """,
            u,
        )
        row = cur.fetchone()
        inserted_users.append(row)
 
    conn.commit()
    print(f"Inserted {len(inserted_users)} users.")
 
    # ── Vehicles ─────────────────────────────────────────────────────────────
    vehicles = []
    for user_id, _ in inserted_users:
        if random.random() < VEHICLE_CHANCE:
            vehicles.append((fake_license_plate(), random.choice(US_STATES), user_id))
            if random.random() < SECOND_VEHICLE_CHANCE:
                vehicles.append((fake_license_plate(), random.choice(US_STATES), user_id))
 
    if vehicles:
        psycopg2.extras.execute_values(
            cur,
            f"""
            INSERT INTO {VEHICLE_TABLE}
                ("licensePlateNumber", "licensePlateState", user_id)
            VALUES %s
            """,
            vehicles,
            page_size=100,
        )
        conn.commit()
        print(f"Inserted {len(vehicles)} vehicles.\n")
 
    # ── Preview ───────────────────────────────────────────────────────────────
    print("Sample users created:")
    for uid, email in inserted_users[:5]:
        u = next(u for u in users if u[2] == email)
        print(f"  user_id={uid}  name={u[0]} {u[1]}  email={email}")
    if len(inserted_users) > 5:
        print(f"  ... and {len(inserted_users) - 5} more.\n")
 
    print("""
Note: Users are created with unusable passwords (can't log in via password).
To set a real password for testing, use the Django shell:
 
    python manage.py shell
    >>> from users.models import User
    >>> u = User.objects.get(email='jane.doe12@gmail.com')
    >>> u.set_password('testpass123')
    >>> u.save()
""")
 
    cur.close()
    conn.close()
 
 
if __name__ == "__main__":
    main()
