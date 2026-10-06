"""
Rajyalakshmi Radhe Traders - Python Inventory & Stock Tool
Usage:
  py python_tools/manage_stock.py            # View all products & bags stock
  py python_tools/manage_stock.py <id> <qty> # Update bag stock for a product
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

    args = sys.argv[1:]
    if len(args) == 2:
        prod_id = args[0]
        try:
            new_qty = float(args[1])
            cursor.execute("UPDATE Product SET stock = ? WHERE id = ?", (new_qty, prod_id))
            conn.commit()
            print(f"Successfully updated Product {prod_id} stock to {new_qty} bags.")
        except Exception as e:
            print(f"Failed to update stock: {e}")

    cursor.execute("""
        SELECT id, name, category, bagWeight, price, stock, active 
        FROM Product 
        ORDER BY category, name
    """)
    rows = cursor.fetchall()

    print("=" * 85)
    print(f"{'ID':<14} | {'NAME':<24} | {'CATEGORY':<12} | {'BAG WT':<8} | {'STOCK (BAGS)'}")
    print("=" * 85)

    for r in rows:
        pid, name, cat, bag_wt, price, stock, active = r
        name_str = (name or "")[:22]
        cat_str = (cat or "")[:11]
        bag_str = f"{bag_wt}kg" if bag_wt else "30kg"
        stock_str = f"{int(stock)} bags" if stock is not None else "0 bags"
        print(f"{pid:<14} | {name_str:<24} | {cat_str:<12} | {bag_str:<8} | {stock_str}")

    print("=" * 85)
    conn.close()

if __name__ == "__main__":
    main()
