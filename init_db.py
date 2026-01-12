#!/usr/bin/env python3
"""
初始化資料庫並添加示例數據
"""

import os
import sqlite3

DATABASE = 'products.db'

def init_database():
    """Initialize database and add sample data"""
    # Create database and tables
    conn = sqlite3.connect(DATABASE)

    # Create products table
    conn.execute('''CREATE TABLE IF NOT EXISTS products
                   (id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL)''')

    # Create batches table
    conn.execute('''CREATE TABLE IF NOT EXISTS batches
                   (id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    batch_number TEXT UNIQUE NOT NULL,
                    unique_code TEXT UNIQUE NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES products (id))''')

    print("✅ 資料庫表已建立")

    # Check if we already have data
    cursor = conn.execute('SELECT COUNT(*) FROM products')
    count = cursor.fetchone()[0]

    if count > 0:
        print("ℹ️ 資料庫中已有數據，跳過初始化")
        conn.close()
        return

    # Add sample products and batches
    sample_data = [
        ("iPhone 15 Pro", "5123456789"),
        ("iPhone 15 Pro", "5123456790"),
        ("MacBook Air M3", "5234567890"),
        ("MacBook Air M3", "5234567891"),
        ("iPad Pro 12.9", "5345678901"),
    ]

    try:
        # Group by product name
        products_added = {}
        batch_count = 0

        for product_name, batch_number in sample_data:
            # Add product if not exists
            if product_name not in products_added:
                # Generate product code (A, B, C, etc.)
                code = chr(65 + len(products_added))  # A, B, C, ...
                conn.execute('INSERT INTO products (name, code) VALUES (?, ?)',
                           (product_name, code))
                products_added[product_name] = code

            # Get product ID
            cursor = conn.execute('SELECT id FROM products WHERE code = ?',
                                (products_added[product_name],))
            product_id = cursor.fetchone()[0]

            # Count existing batches for this product
            cursor = conn.execute('SELECT COUNT(*) FROM batches WHERE product_id = ?',
                                (product_id,))
            count = cursor.fetchone()[0]

            # Generate unique code
            unique_code = f"{products_added[product_name]}{count + 1}"

            # Add batch
            conn.execute('INSERT INTO batches (product_id, batch_number, unique_code) VALUES (?, ?, ?)',
                       (product_id, batch_number, unique_code))
            batch_count += 1

        conn.commit()
        print(f"✅ 已添加 {len(products_added)} 個示例產品和 {batch_count} 個批次")
    except Exception as e:
        conn.rollback()
        print(f"❌ 添加示例數據失敗: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()
    print("🎉 資料庫初始化完成！")
