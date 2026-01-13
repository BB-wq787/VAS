#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Flask API端点的脚本
"""
import requests

def test_api():
    """测试API端点"""
    url = "http://localhost:5000/api/extract_batch_from_url?url=http://nebl.cn/02130832411190283934"

    try:
        print("正在测试API端点...")
        response = requests.get(url, timeout=30)
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("API响应数据:")
            print(f"  URL: {data.get('url')}")
            print(f"  批次号找到: {data.get('batch_found')}")
            print(f"  批次号: {data.get('batch_number')}")
            print(f"  内容长度: {data.get('content_length')}")
            if data.get('product_info'):
                print(f"  产品信息: {data.get('product_info')}")
        else:
            print(f"错误: {response.text}")

    except Exception as e:
        print(f"请求失败: {str(e)}")

if __name__ == "__main__":
    test_api()

