from app import app, get_all_products
import json

with app.app_context():
    try:
        print("Testing get_all_products()...")
        products_data = get_all_products()
        print(f"Raw data type: {type(products_data)}")
        print(f"Number of items: {len(products_data)}")

        # Check first few items
        for i, p in enumerate(products_data[:3]):
            print(f"Item {i}: {dict(p)}")
            print(f"  Types: id={type(p['id'])}, name={type(p['name'])}, code={type(p['code'])}, batch_id={type(p['batch_id'])}, batch_number={type(p['batch_number'])}, quantity={type(p['quantity'])}")

        # Try to jsonify
        print("\nTesting JSON serialization...")
        from flask import jsonify
        response_data = [{
            'id': p['id'],
            'name': p['name'],
            'code': p['code'],
            'batch_id': p['batch_id'],
            'batch_number': p['batch_number'],
            'quantity': p['quantity'] if p['quantity'] is not None else 0
        } for p in products_data]

        json_str = json.dumps(response_data[:3], ensure_ascii=False)
        print(f"JSON sample: {json_str}")

        print("API test successful!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
