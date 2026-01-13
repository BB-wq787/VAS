#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试URL批次号提取功能的脚本
"""
import requests
import re

def extract_batch_from_text(text):
    """Extract batch number from OCR text - 5開頭的10個字符批次號"""
    lines = text.split('\n')

    for line in text.split('\n'):
        line = line.strip().upper()

        # 精確匹配：以5開頭的10個字符批次號
        batch_match = re.search(r'\b5[A-Z0-9]{9}\b', line)
        if batch_match:
            candidate = batch_match.group(0)
            if len(candidate) == 10 and candidate.startswith('5'):
                return candidate

    # 如果沒有找到，嘗試在整個文本中查找
    text_upper = text.upper()
    batch_match = re.search(r'\b5[A-Z0-9]{9}\b', text_upper)
    if batch_match:
        candidate = batch_match.group(0)
        if len(candidate) == 10 and candidate.startswith('5'):
            return candidate

    return None

def test_url_extraction(url):
    """测试URL提取功能"""
    print(f"测试URL: {url}")

    try:
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'VAS-Batch-Identifier/1.0'
        })

        if response.status_code != 200:
            print(f"请求失败: HTTP {response.status_code}")
            return None

        content = response.text
        print(f"页面内容长度: {len(content)} 字符")

        # 提取批次号
        batch_number = extract_batch_from_text(content)

        if batch_number:
            print(f"✅ 找到批次号: {batch_number}")
        else:
            print("❌ 未找到批次号")
            print("页面内容预览 (前500字符):")
            print("-" * 50)
            print(content[:500])
            print("-" * 50)

        return batch_number

    except Exception as e:
        print(f"错误: {str(e)}")
        return None

if __name__ == "__main__":
    # 测试一些常见的URL
    test_urls = [
        "https://example.com",  # 这不会包含批次号
        "https://httpbin.org/html",  # 简单的HTML页面
        "http://nebl.cn/02130832411190283934",  # 用户提供的URL
    ]

    # 添加一个包含批次号的测试内容
    test_content = """
    这是一个测试页面
    产品批次号: 5ABC123DEF
    生产日期: 2024-01-01
    """

    print("测试内容提取:")
    batch = extract_batch_from_text(test_content)
    print(f"结果: {batch}")
    print()

    for url in test_urls:
        result = test_url_extraction(url)
        print()
