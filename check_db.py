import sqlite3

conn = sqlite3.connect('products.db')
cursor = conn.cursor()

# Check tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = [row[0] for row in cursor.fetchall()]
print('Tables:', tables)

# Check products table schema
cursor.execute('PRAGMA table_info(products)')
products_columns = [row[1] for row in cursor.fetchall()]
print('Products columns:', products_columns)

# Check batches table schema
cursor.execute('PRAGMA table_info(batches)')
batches_columns = [row[1] for row in cursor.fetchall()]
print('Batches columns:', batches_columns)

conn.close()
