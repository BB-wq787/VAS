import requests

url = 'http://localhost:5000/products'
print(f'Testing URL: {url}')

try:
    response = requests.get(url, timeout=10)
    print(f'Status: {response.status_code}')
    print(f'Content-Type: {response.headers.get("content-type", "unknown")}')
    print(f'Content-Length: {len(response.text)}')
    print('Response preview:')
    print(response.text[:500])
except Exception as e:
    print(f'Exception: {e}')
