#!/usr/bin/env python3
"""
添加批次號到產品資料庫
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import app, add_batch_to_product

def main():
    try:
        with app.app_context():
            # 添加批次號到 iPhone 15 Pro (ID: 1)
            product_id = 1  # iPhone 15 Pro
            batch_number = '52910017C1'

            print(f'正在添加批次號 {batch_number} 到產品 ID {product_id}...')

            result = add_batch_to_product(product_id, batch_number)

            if result:
                print('成功添加批次號到資料庫!')
                print(f'產品ID: {result["product_id"]}')
                print(f'批次號: {result["batch_number"]}')
                print(f'唯一編號: {result["unique_code"]}')
            else:
                print('添加批次號失敗 - 批次號可能已存在')

    except Exception as e:
        print(f'錯誤: {e}')

if __name__ == "__main__":
    main()
