

import psycopg2

DATABASE_URL = "postgresql://postgres:TyGPonnJZktbYzVeqUZfmwdhHRcEXwZT@tramway.proxy.rlwy.net:32615/railway"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True

cur = conn.cursor()

cur.execute("""
ALTER TABLE profile
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
""")

cur.execute("""
ALTER TABLE profile
ADD COLUMN IF NOT EXISTS avatar_public_id TEXT;
""")

print("Profile columns fixed ✅")

cur.close()
conn.close()
