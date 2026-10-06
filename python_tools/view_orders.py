"""
Rajyalakshmi Radhe Traders - Python Order Viewer
Run with: py python_tools/view_orders.py
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
        SELECT orderNumber, customerName, customerPhone, total, status, createdAt 
        FROM 'Order' 
        ORDER BY createdAt DESC 
        LIMIT 15
    """)
    rows = cursor.fetchall()

    print("=" * 80)
    print(f"{'ORDER #':<10} | {'CUSTOMER':<22} | {'PHONE':<15} | {'TOTAL':<14} | {'STATUS'}")
    print("=" * 80)

    if not rows:
        print("No orders placed yet.")
    else:
        for r in rows:
            order_num, name, phone, total, status, created = r
            name_str = (name or "Customer")[:20]
            phone_str = (phone or "N/A")[:14]
            total_str = f"Rs. {total:,.2f}" if total is not None else "Rs. 0.00"
            print(f"#{order_num:<9} | {name_str:<22} | {phone_str:<15} | {total_str:<14} | {status}")

    print("=" * 90)
    conn.close()

if __name__ == "__main__":
    main()
