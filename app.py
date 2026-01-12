import os
import sqlite3
from flask import Flask, render_template, jsonify, request, redirect, url_for, g

app = Flask(__name__)

# Database configuration
DATABASE = 'products.db'

def get_db():
    """Get database connection"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Close database connection"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize database"""
    with app.app_context():
        db = get_db()
        # Products table
        db.execute('''CREATE TABLE IF NOT EXISTS products
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      name TEXT UNIQUE NOT NULL,
                      code TEXT UNIQUE NOT NULL)''')

        # Batches table
        db.execute('''CREATE TABLE IF NOT EXISTS batches
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      product_id INTEGER NOT NULL,
                      batch_number TEXT UNIQUE NOT NULL,
                      unique_code TEXT UNIQUE NOT NULL,
                      FOREIGN KEY (product_id) REFERENCES products (id))''')
        db.commit()

# Database functions
def get_all_products():
    """Get all products with their batches"""
    db = get_db()
    cursor = db.execute('''
        SELECT p.id, p.name, p.code, b.id as batch_id, b.batch_number, b.unique_code
        FROM products p
        LEFT JOIN batches b ON p.id = b.product_id
        ORDER BY p.name, b.batch_number
    ''')
    return cursor.fetchall()

def get_products_list():
    """Get list of products only"""
    db = get_db()
    cursor = db.execute('SELECT * FROM products ORDER BY name')
    return cursor.fetchall()

def get_product_by_batch(batch_number):
    """Get product by batch number"""
    db = get_db()
    cursor = db.execute('''
        SELECT p.*, b.batch_number, b.unique_code
        FROM products p
        JOIN batches b ON p.id = b.product_id
        WHERE b.batch_number = ?
    ''', (batch_number,))
    return cursor.fetchone()

def add_product(name):
    """Add a new product and assign a code"""
    try:
        db = get_db()

        # Generate product code (A, B, C, etc.) - find next available letter
        cursor = db.execute('SELECT code FROM products ORDER BY code')
        existing_codes = [row['code'] for row in cursor.fetchall()]

        # Find next available code starting from A
        code = 'A'
        while code in existing_codes:
            code = chr(ord(code) + 1)
            # If we reach Z, start over from AA, AB, etc. (for future expansion)
            if ord(code) > ord('Z'):
                # For now, just keep incrementing - this is a simple solution
                pass

        db.execute('INSERT INTO products (name, code) VALUES (?, ?)',
                  (name, code))
        db.commit()

        # Get the inserted product
        cursor = db.execute('SELECT * FROM products WHERE code = ?', (code,))
        return cursor.fetchone()
    except sqlite3.IntegrityError as e:
        # Check if it's a duplicate name or code error
        error_msg = str(e).lower()
        if 'name' in error_msg:
            raise ValueError('Product name already exists')
        elif 'code' in error_msg:
            raise ValueError('Product code already exists')
        else:
            raise ValueError('Database integrity error')

def add_batch_to_product(product_id, batch_number):
    """Add a batch to an existing product"""
    try:
        db = get_db()

        # Get product code
        cursor = db.execute('SELECT code FROM products WHERE id = ?', (product_id,))
        product = cursor.fetchone()
        if not product:
            return None

        # Count existing batches for this product
        cursor = db.execute('SELECT COUNT(*) as count FROM batches WHERE product_id = ?', (product_id,))
        count = cursor.fetchone()['count']

        # Generate unique code (e.g., A1, A2, B1, B2)
        unique_code = f"{product['code']}{count + 1}"

        db.execute('INSERT INTO batches (product_id, batch_number, unique_code) VALUES (?, ?, ?)',
                  (product_id, batch_number, unique_code))
        db.commit()

        # Get the inserted batch
        cursor = db.execute('SELECT * FROM batches WHERE unique_code = ?', (unique_code,))
        return cursor.fetchone()
    except sqlite3.IntegrityError:
        return None  # Batch number already exists

def update_product(product_id, name):
    """Update a product name"""
    db = get_db()
    db.execute('UPDATE products SET name = ? WHERE id = ?',
              (name, product_id))
    db.commit()
    return db.total_changes > 0

def update_batch(batch_id, batch_number):
    """Update a batch number"""
    try:
        db = get_db()
        # Get product code for unique code generation
        cursor = db.execute('''
            SELECT p.code FROM products p
            JOIN batches b ON p.id = b.product_id
            WHERE b.id = ?
        ''', (batch_id,))
        product = cursor.fetchone()
        if not product:
            return False

        # Get batch position for unique code
        cursor = db.execute('''
            SELECT COUNT(*) as position FROM batches
            WHERE product_id = (SELECT product_id FROM batches WHERE id = ?)
            AND id <= ?
        ''', (batch_id, batch_id))
        position = cursor.fetchone()['position']

        unique_code = f"{product['code']}{position}"

        db.execute('UPDATE batches SET batch_number = ?, unique_code = ? WHERE id = ?',
                  (batch_number, unique_code, batch_id))
        db.commit()
        return db.total_changes > 0
    except sqlite3.IntegrityError:
        return False  # Batch number already exists

def delete_product(product_id):
    """Delete a product and all its batches"""
    db = get_db()
    # Delete batches first (due to foreign key constraint)
    db.execute('DELETE FROM batches WHERE product_id = ?', (product_id,))
    # Delete product
    db.execute('DELETE FROM products WHERE id = ?', (product_id,))
    db.commit()
    return db.total_changes > 0

def delete_batch(batch_id):
    """Delete a specific batch"""
    db = get_db()
    db.execute('DELETE FROM batches WHERE id = ?', (batch_id,))
    db.commit()
    return db.total_changes > 0

@app.route('/')
def index():
    """Serve the main web page"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

# Product management routes
@app.route('/products')
def products():
    """Display all products with batches"""
    all_data = get_all_products()
    return render_template('products.html', products=all_data)

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products and batches as JSON"""
    products_data = get_all_products()
    return jsonify([{
        'id': p['id'],
        'name': p['name'],
        'code': p['code'],
        'batch_id': p['batch_id'],
        'batch_number': p['batch_number'],
        'unique_code': p['unique_code']
    } for p in products_data])  # Include all products, even those without batches

@app.route('/api/products', methods=['POST'])
def add_product_api():
    """Add a new product with its first batch"""
    data = request.get_json()
    if not data or not data.get('name') or not data.get('batch_number'):
        return jsonify({'error': 'Product name and batch number are required'}), 400

    # Validate batch number format
    batch_number = data['batch_number']
    if not batch_number.startswith('5') or len(batch_number) != 10:
        return jsonify({'error': 'Batch number must be 10 characters starting with 5'}), 400

    try:
        # Start transaction
        db = get_db()

        # Create product first
        product = add_product(data['name'])
        if not product:
            return jsonify({'error': 'Failed to create product'}), 500

        # Add batch to the product
        batch = add_batch_to_product(product['id'], batch_number)
        if not batch:
            # If batch creation fails, we should ideally rollback the product creation
            # But since we're using SQLite without explicit transactions, we'll leave the product
            return jsonify({'error': 'Product created but batch number already exists'}), 400

        return jsonify({
            'id': product['id'],
            'name': product['name'],
            'code': product['code'],
            'batch_id': batch['id'],
            'batch_number': batch['batch_number'],
            'unique_code': batch['unique_code']
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create product with batch: {str(e)}'}), 500

@app.route('/api/batches', methods=['POST'])
def add_batch_api():
    """Add a batch to a product"""
    data = request.get_json()
    if not data or not data.get('product_id') or not data.get('batch_number'):
        return jsonify({'error': 'Product ID and batch number are required'}), 400

    # Validate batch number format
    if not data['batch_number'].startswith('5') or len(data['batch_number']) != 10:
        return jsonify({'error': 'Batch number must be 10 characters starting with 5'}), 400

    batch = add_batch_to_product(data['product_id'], data['batch_number'])
    if not batch:
        return jsonify({'error': 'Batch number already exists'}), 400

    return jsonify({
        'id': batch['id'],
        'product_id': batch['product_id'],
        'batch_number': batch['batch_number'],
        'unique_code': batch['unique_code']
    })

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product_api(product_id):
    """Update a product name"""
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({'error': 'Product name is required'}), 400

    success = update_product(product_id, data['name'])
    if not success:
        return jsonify({'error': 'Product not found or update failed'}), 404

    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/batches/<int:batch_id>', methods=['PUT'])
def update_batch_api(batch_id):
    """Update a batch number"""
    data = request.get_json()

    if not data or not data.get('batch_number'):
        return jsonify({'error': 'Batch number is required'}), 400

    # Validate batch number format
    if not data['batch_number'].startswith('5') or len(data['batch_number']) != 10:
        return jsonify({'error': 'Batch number must be 10 characters starting with 5'}), 400

    success = update_batch(batch_id, data['batch_number'])
    if not success:
        return jsonify({'error': 'Batch number already exists or batch not found'}), 400

    return jsonify({'message': 'Batch updated successfully'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product_api(product_id):
    """Delete a product and all its batches"""
    success = delete_product(product_id)
    if not success:
        return jsonify({'error': 'Product not found'}), 404

    return jsonify({'message': 'Product and all its batches deleted successfully'})

@app.route('/api/batches/<int:batch_id>', methods=['DELETE'])
def delete_batch_api(batch_id):
    """Delete a specific batch"""
    success = delete_batch(batch_id)
    if not success:
        return jsonify({'error': 'Batch not found'}), 404

    return jsonify({'message': 'Batch deleted successfully'})

@app.route('/api/search_product/<batch_number>')
def search_product(batch_number):
    """Search for product by batch number"""
    product = get_product_by_batch(batch_number)
    if product:
        return jsonify({
            'found': True,
            'name': product['name'],
            'batch_number': product['batch_number'],
            'unique_code': product['unique_code'],
            'product_code': product['code']
        })
    else:
        return jsonify({
            'found': False,
            'batch_number': batch_number
        })

@app.route('/api/fetch_url')
def fetch_url():
    """Fetch URL content and return it"""
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    try:
        import requests
        from urllib.parse import urlparse

        # Basic URL validation
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return jsonify({'error': 'Invalid URL format'}), 400

        # Fetch the URL content
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'VAS-Batch-Identifier/1.0'
        })

        if response.status_code != 200:
            return jsonify({'error': f'HTTP {response.status_code}: {response.reason}'}), 400

        content = response.text

        return jsonify({
            'url': url,
            'content': content,
            'content_length': len(content)
        })

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@app.route('/api/extract_batch_from_url')
def extract_batch_from_url():
    """Fetch URL content and extract batch number server-side (optimized)"""
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    try:
        import requests
        from urllib.parse import urlparse

        # Basic URL validation
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return jsonify({'error': 'Invalid URL format'}), 400

        # Fetch the URL content
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'VAS-Batch-Identifier/1.0'
        })

        if response.status_code != 200:
            return jsonify({'error': f'HTTP {response.status_code}: {response.reason}'}), 400

        content = response.text

        # Extract batch number server-side
        batch_number = extract_batch_from_text(content)

        # Get product info if batch found
        product_info = None
        if batch_number:
            product_info = get_product_info_by_batch(batch_number)

        # Return minimal data (much faster than sending entire content)
        return jsonify({
            'url': url,
            'batch_found': batch_number is not None,
            'batch_number': batch_number,
            'product_info': product_info,
            'content_preview': content[:500] + '...' if len(content) > 500 else content,  # Small preview only
            'content_length': len(content)
        })

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


def extract_batch_from_text(text):
    """Extract batch number from OCR text - 5開頭的10個字符批次號"""
    lines = text.split('\n')

    for line in lines:
        line = line.strip().upper()

        # 精確匹配：以5開頭的10個字符批次號
        import re

        # 優先匹配：5開頭的10個字符批次號
        batch_match = re.search(r'\b5[A-Z0-9]{9}\b', line)
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

def get_product_info_by_batch(batch_number):
    """Get product information by batch number"""
    try:
        product = get_product_by_batch(batch_number)
        if product:
            return {
                'found': True,
                'name': product['name'],
                'batch_number': product['batch_number'],
                'product_code': product['code'],
                'unique_code': product['unique_code']
            }
        else:
            return {
                'found': False,
                'batch_number': batch_number
            }
    except Exception as e:
        return {
            'found': False,
            'batch_number': batch_number,
            'error': str(e)
        }

if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)

    # Initialize database
    init_db()
    print("Database initialized successfully")

    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)