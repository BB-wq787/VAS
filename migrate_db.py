#!/usr/bin/env python3
"""
資料庫遷移腳本：移除batches表中的unique_code欄位
"""

import sqlite3
import os

def migrate_database():
    """遷移資料庫，移除batches表中的unique_code欄位"""
    db_path = 'products.db'

    if not os.path.exists(db_path):
        print("資料庫檔案不存在，無需遷移")
        return

    try:
        # 連接到資料庫
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 檢查是否已有unique_code欄位
        cursor.execute("PRAGMA table_info(batches)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        if 'unique_code' not in column_names:
            print("unique_code欄位已經不存在，無需遷移")
            conn.close()
            return

        print("開始資料庫遷移...")

        # 建立新的batches表（沒有unique_code欄位）
        cursor.execute('''
            CREATE TABLE batches_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                batch_number TEXT UNIQUE NOT NULL,
                quantity INTEGER DEFAULT 1,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')

        # 複製資料到新表
        cursor.execute('''
            INSERT INTO batches_new (id, product_id, batch_number, quantity)
            SELECT id, product_id, batch_number, quantity FROM batches
        ''')

        # 刪除舊表
        cursor.execute('DROP TABLE batches')

        # 重新命名新表
        cursor.execute('ALTER TABLE batches_new RENAME TO batches')

        # 提交變更
        conn.commit()

        print("資料庫遷移完成！unique_code欄位已移除")

        # 驗證遷移結果
        cursor.execute("PRAGMA table_info(batches)")
        columns = cursor.fetchall()
        print("新的batches表結構：")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")

    except Exception as e:
        print(f"遷移失敗: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
