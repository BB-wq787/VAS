import requests
import json

try:
    response = requests.get('http://localhost:5000/api/products', timeout=10)
    print(f'Status Code: {response.status_code}')
    print(f'Headers: {dict(response.headers)}')
    print(f'Content: {response.text}')

    if response.status_code == 200:
        try:
            data = response.json()
            print(f'JSON Data: {json.dumps(data, indent=2, ensure_ascii=False)}')
        except json.JSONDecodeError as e:
            print(f'JSON decode error: {e}')
    else:
        print(f'Error response: {response.text}')

except requests.exceptions.RequestException as e:
    print(f'Request error: {e}')
except Exception as e:
    print(f'Other error: {e}')