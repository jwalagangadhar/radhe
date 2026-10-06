"""
Rajyalakshmi Radhe Traders - Python Customer Viewer
Run with: py python_tools/view_customers.py
"""

import sqlite3
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, phone, name, email, phoneVerified, status, createdAt 
        FROM CustomerUser 
        ORDER BY createdAt DESC
    """)
    rows = cursor.fetchall()

    print("=" * 80)
    print(f"{'PHONE':<16} | {'NAME':<24} | {'VERIFIED':<10} | {'STATUS':<10} | {'JOINED'}")
    print("=" * 80)

    if not rows:
        print("No registered customers yet.")
    else:
        for r in rows:
            uid, phone, name, email, verified, status, created = r
            name_str = (name or "Unassigned")[:22]
            verified_str = "YES (OTP)" if verified else "NO"
            created_str = str(created)[:10]
            print(f"{phone:<16} | {name_str:<24} | {verified_str:<10} | {status:<10} | {created_str}")

    print("=" * 80)
    conn.close()

if __name__ == "__main__":
    main()
