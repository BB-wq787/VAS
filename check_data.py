import sqlite3

conn = sqlite3.connect('products.db')
cursor = conn.cursor()

# Check products data
cursor.execute('SELECT * FROM products LIMIT 5')
products = cursor.fetchall()
print('Products:', products)

# Check batches data
cursor.execute('SELECT * FROM batches LIMIT 5')
batches = cursor.fetchall()
print('Batches:', batches)

# Test the problematic query
cursor.execute('''
    SELECT p.id, p.name, p.code, b.id as batch_id, b.batch_number, b.quantity
    FROM products p
    LEFT JOIN batches b ON p.id = b.product_id
    ORDER BY p.name, b.batch_number
''')
results = cursor.fetchall()
print('Query results:', results)

conn.close()
