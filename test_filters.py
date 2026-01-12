#!/usr/bin/env python3
"""
测试产品管理筛选功能
"""

import requests
import json

def test_api_response():
    """测试API响应"""
    print("测试API响应...")
    response = requests.get('http://localhost:5000/api/products', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ API返回 {len(data)} 条记录")
        return data
    else:
        print("❌ API错误")
        return None

def test_page_load():
    """测试页面加载"""
    print("测试页面加载...")
    response = requests.get('http://localhost:5000/products', timeout=5)
    if response.status_code == 200:
        content = response.text
        checks = [
            ('篩選條件', '筛选标题'),
            ('filterProductName', '产品名称筛选'),
            ('filterProductCode', '产品代码筛选'),
            ('filterBatchNumber', '批次号筛选'),
            ('filterShowEmpty', '显示选项筛选'),
            ('clearFiltersBtn', '清除筛选按钮')
        ]
        for check_text, description in checks:
            if check_text in content:
                print(f"✅ {description} 已添加")
            else:
                print(f"❌ {description} 缺失")
        return True
    else:
        print("❌ 页面加载失败")
        return False

def main():
    print("=== 产品管理筛选功能测试 ===\n")

    # 测试页面加载
    if not test_page_load():
        return

    print()

    # 测试API
    data = test_api_response()
    if not data:
        return

    print()

    # 分析数据结构
    print("数据结构分析:")
    products = {}
    for item in data:
        pid = item['id']
        if pid not in products:
            products[pid] = {
                'name': item['name'],
                'code': item['code'],
                'batches': []
            }
        if item.get('batch_id'):
            products[pid]['batches'].append(item['batch_number'])

    print(f"发现 {len(products)} 个产品:")
    for pid, product in products.items():
        print(f"  - {product['name']} ({product['code']}): {len(product['batches'])} 个批次")

    print("\n🎉 筛选功能测试完成！")
    print("请在浏览器中访问 http://localhost:5000/products 测试筛选功能")

if __name__ == "__main__":
    main()
