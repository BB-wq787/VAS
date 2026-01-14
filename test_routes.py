#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Flask路由的脚本
"""
import requests

def test_route(url, description):
    """测试路由"""
    try:
        print(f"\n测试 {description}: {url}")
        response = requests.get(url, timeout=10)
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            content_length = len(response.text)
            print(f"内容长度: {content_length} 字符")
            if content_length < 500:
                print(f"内容预览: {response.text[:200]}...")
        else:
            print(f"错误内容: {response.text}")

    except Exception as e:
        print(f"请求失败: {str(e)}")

if __name__ == "__main__":
    base_url = "http://localhost:5000"

    test_route(f"{base_url}/", "主页")
    test_route(f"{base_url}/test_frontend.html", "测试页面")
    test_route(f"{base_url}/api/extract_batch_from_url?url=http://nebl.cn/02130832411190283934", "API端点")


