#!/usr/bin/env python3
"""
測試修復後的新增批次功能
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import app, add_batch_to_product

def test_batch_addition():
    """Test adding batches with different batch numbers"""
    try:
        with app.app_context():
            print('🧪 測試修復後的新增批次功能\n')

            # Test adding different batch numbers to product A (ID: 1)
            test_cases = [
                ('5123456788', 1),  # Different batch number
                ('5123456787', 2),  # Another different batch number
                ('5123456786', 1),  # Yet another different batch number
            ]

            for batch_number, quantity in test_cases:
                print(f'正在測試新增批次號: {batch_number}, 數量: {quantity}')

                result = add_batch_to_product(1, batch_number, quantity)  # Product A

                if result:
                    print(f'成功新增批次!')
                    print(f'   產品ID: {result["product_id"]}')
                    print(f'   批次號: {result["batch_number"]}')
                    print(f'   唯一編號: {result["unique_code"]}')
                    print(f'   數量: {result["quantity"]}')
                else:
                    print(f'新增批次失敗 - 批次號 {batch_number} 可能已存在')
                print()

            # Test adding duplicate batch number (should fail)
            print('測試重複批次號 (應該失敗):')
            duplicate_result = add_batch_to_product(1, '5123456788', 1)  # Same as first test
            if duplicate_result:
                print('錯誤：重複批次號被允許新增!')
            else:
                print('正確：重複批次號被拒絕')

            print('\n測試完成!')

    except Exception as e:
        print(f'測試錯誤: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_batch_addition()
