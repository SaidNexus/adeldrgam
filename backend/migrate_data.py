import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
import sys

# Connection Strings
LOCAL_DB = "postgresql://postgres:saed1234@localhost:5432/cms_db"
RAILWAY_DB = "postgresql://postgres:TyGPonnJZktbYzVeqUZfmwdhHRcEXwZT@postgres.railway.internal:5432/railway"

# Tables to migrate (Ordered by dependency)
TABLES = [
    "category",
    "user",
    "profile",
    "article",
    "articlelike",
    "articleview",
    "comment",
    "notification",
    "notificationpreferences",
    "passwordresettoken",
    "refreshtoken",
    "userfollow",
    "publisher_requests",
    "site_stats",
    "alembic_version"
]

def migrate():
    try:
        local_engine = sa.create_engine(LOCAL_DB)
        railway_engine = sa.create_engine(
            RAILWAY_DB, 
            connect_args={"connect_timeout": 10},
            pool_pre_ping=True
        )
        
        print("Connected to both databases.")
        
        with local_engine.connect() as local_conn, railway_engine.begin() as railway_conn:
            for table_name in TABLES:
                print(f"Migrating table: {table_name}...")
                
                # Fetch data from local
                result = local_conn.execute(sa.text(f'SELECT * FROM "{table_name}"'))
                rows = [dict(row._mapping) for row in result]
                
                if not rows:
                    print(f"  - No data in {table_name}, skipping.")
                    continue
                
                # Clear existing data in Railway (to avoid duplicates/conflicts)
                railway_conn.execute(sa.text(f'TRUNCATE TABLE "{table_name}" CASCADE'))
                print(f"  - Cleared existing data in Railway {table_name}.")
                
                # Insert into Railway
                # Build the column names and place-holders
                columns = list(rows[0].keys())
                print(f"  - Table columns in local: {columns}")
                
                # Check Railway columns for this table
                inspector = sa.inspect(railway_engine)
                rw_columns = [c['name'] for c in inspector.get_columns(table_name)]
                print(f"  - Table columns in Railway: {rw_columns}")
                
                # Only insert columns that exist in both
                common_columns = [c for c in columns if c in rw_columns]
                if len(common_columns) < len(columns):
                    print(f"  - WARNING: Skipping columns missing in Railway: {set(columns) - set(rw_columns)}")
                
                query = sa.text(f'INSERT INTO "{table_name}" ({", ".join([f'"{c}"' for c in common_columns])}) VALUES ({", ".join([f":{c}" for c in common_columns])})')
                
                # Filter rows to only include common columns
                filtered_rows = [{c: row[c] for c in common_columns} for row in rows]
                
                print(f"  - Inserting {len(filtered_rows)} rows one by one...")
                success_count = 0
                for i, row_data in enumerate(filtered_rows):
                    try:
                        railway_conn.execute(query, row_data)
                        success_count += 1
                        if (i + 1) % 10 == 0 or (i + 1) == len(filtered_rows):
                            print(f"    - Progress: {i + 1}/{len(filtered_rows)}...")
                    except Exception as e:
                        print(f"    - Error inserting row {i+1}: {e}")
                
                print(f"  - Successfully migrated {success_count} rows to {table_name}.")
                
        print("\nMigration Completed Successfully!")
        
        # Verify counts
        print("\n--- Verification ---")
        with railway_engine.connect() as conn:
            for table_name in ["user", "article", "category", "publisher_requests"]:
                res = conn.execute(sa.text(f'SELECT COUNT(*) FROM "{table_name}"'))
                count = res.scalar()
                print(f"{table_name}: {count} rows on Railway")
                
    except Exception as e:
        print(f"\nMigration Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate()
