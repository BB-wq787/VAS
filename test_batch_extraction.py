#!/usr/bin/env python3
"""
測試批次號提取邏輯
"""

import re

def extract_batch_from_text(text):
    """Extract batch number from OCR text - 5開頭的10個字符批次號"""
    lines = text.split('\n')

    for line in lines:
        line = line.strip().upper()

        # 精確匹配：以5開頭的10個字符批次號（獨立序列）
        # 優先匹配：5開頭的10個字符批次號
        batch_match = None

        # 查找所有以5开头后跟9个字母数字字符的序列
        potential_matches = re.findall(r'5[A-Z0-9]{9}', line)
        for match in potential_matches:
            # 检查这个匹配是否是独立的（前后没有其他字母数字字符）
            match_start = line.find(match)
            match_end = match_start + len(match)

            # 检查前面是否有字母数字字符
            before_char = line[match_start - 1] if match_start > 0 else ' '
            after_char = line[match_end] if match_end < len(line) else ' '

            # 如果前后都是非字母数字字符（或字符串边界），这就是一个有效的匹配
            if not (before_char.isalnum() or after_char.isalnum()):
                batch_match = match
                break

        if batch_match:
            candidate = batch_match
            # 確保是精確的10個字符且以5開頭
            if len(candidate) == 10 and candidate.startswith('5'):
                return candidate
        if batch_match:
            candidate = batch_match.group(0)
            # 確保是精確的10個字符且以5開頭
            if len(candidate) == 10 and candidate.startswith('5'):
                return candidate

        # 備用模式：查找包含5開頭序列的模式（如果精確匹配失敗）
        if not batch_match:
            backup_patterns = [
                r'5\s+\d{3}\s+\d{3}\s+\d{3}',  # 5 123 456 789 格式（數字）
                r'5[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}',  # 5-ABC-DEF-GHI 格式
            ]

            for pattern in backup_patterns:
                match = re.search(pattern, line)
                if match:
                    # 清理匹配結果
                    candidate = re.sub(r'[\s\-]', '', match.group(0))
                    if len(candidate) == 10 and candidate.startswith('5') and candidate[1:].isalnum():
                        return candidate

    return None

def test_batch_extraction():
    """測試批次號提取"""
    test_cases = [
        # 正常情況
        ("PRODUCT: 5123456789 LOT: ABC123", "5123456789"),
        ("BATCH 5ABCDEFGHI STATUS: OK", "5ABCDEFGHI"),
        ("CODE: 5A1B2C3D4E QUALITY: GOOD", "5A1B2C3D4E"),

        # 帶分隔符的情況
        ("ITEM: 5 123 456 789 TYPE: A", "5123456789"),
        ("NUMBER: 5-ABC-DEF-GHI STATUS: PASS", "5ABCDEFGHI"),

        # 應該不匹配的情況
        ("LOT: L123456789 STATUS: OK", None),  # L開頭，不是5
        ("CODE: 512345678 STATUS: OK", None),  # 只有9個字符
        ("BATCH: 6123456789 TYPE: B", None),   # 6開頭，不是5

        # 邊界情況
        ("START 5123456789 END", "5123456789"),
        ("BEFORE 5ABCDEFGHI AFTER", "5ABCDEFGHI"),
    ]

    print("🧪 測試批次號提取邏輯")
    print("=" * 60)

    passed = 0
    failed = 0

    for i, (input_text, expected) in enumerate(test_cases, 1):
        result = extract_batch_from_text(input_text)
        status = "✅" if result == expected else "❌"

        print("2")
        print(f"   輸入: {input_text}")
        print(f"   期望: {expected}")
        print(f"   結果: {result}")

        # 调试信息 - 只对失败的案例
        if result != expected:
            lines = input_text.split('\n')
            for line in lines:
                line = line.strip().upper()
                print(f"   處理行: '{line}'")

                # 检查所有潜在匹配
                potential_matches = re.findall(r'5[A-Z0-9]{9}', line)
                print(f"   找到的潛在匹配: {potential_matches}")

                for match in potential_matches:
                    match_start = line.find(match)
                    match_end = match_start + len(match)
                    before_char = line[match_start - 1] if match_start > 0 else ' '
                    after_char = line[match_end] if match_end < len(line) else ' '
                    print(f"   匹配 '{match}': 前='{before_char}' 後='{after_char}' 有效={not (before_char.isalnum() or after_char.isalnum())}")

        if result == expected:
            passed += 1
        else:
            failed += 1
        print()

    print("=" * 60)
    print(f"📊 測試結果: {passed} 通過, {failed} 失敗")

    if failed == 0:
        print("🎉 所有測試通過！")
    else:
        print("⚠️  有測試失敗，請檢查邏輯")

    return failed == 0

if __name__ == "__main__":
    test_batch_extraction()
