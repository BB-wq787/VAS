#!/usr/bin/env python3
"""
測試優化後的API性能
"""

import requests
import time

def test_optimized_api():
    print('=== 性能測試 ===')
    url = 'http://nebl.cn/02130862504280585324'

    print('測試優化後的API (/api/extract_batch_from_url)...')
    start_time = time.time()

    try:
        response = requests.get(f'http://localhost:5000/api/extract_batch_from_url?url={url}', timeout=15)
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            print(f'✅ 耗時: {elapsed:.2f}秒')
            print(f'   響應大小: {len(str(data))} 字符')
            print(f'   批次號: {data.get("batch_number")}')
            print(f'   內容長度: {data.get("content_length")} 字符')
            print(f'   預覽長度: {len(data.get("content_preview", ""))} 字符')

            # 比較舊方法的數據傳輸量
            old_response_size = data.get("content_length", 0) + 200  # 舊方法發送整個內容
            new_response_size = len(str(data))
            savings = old_response_size - new_response_size
            ratio = old_response_size / new_response_size if new_response_size > 0 else float('inf')

            print()
            print('🚀 優化效果:')
            print(f'   舊方法響應大小: ~{old_response_size:,} 字符')
            print(f'   新方法響應大小: {new_response_size:,} 字符')
            print(f'   減少數據傳輸: {savings:,} 字符 ({ratio:.1f}x 更高效)')
        else:
            print(f'❌ API失敗: {response.status_code} - {response.text}')

    except Exception as e:
        print(f'❌ 測試失敗: {e}')

if __name__ == "__main__":
    test_optimized_api()
