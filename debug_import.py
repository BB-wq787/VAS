#!/usr/bin/env python3
"""
调试导入问题
"""

import sys
import os

print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

print("\nTrying to import flask_sqlalchemy...")
try:
    from flask_sqlalchemy import SQLAlchemy
    print("✅ Flask-SQLAlchemy imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")

print("\nChecking site-packages...")
import site
for path in site.getsitepackages():
    flask_sqlalchemy_path = os.path.join(path, 'flask_sqlalchemy')
    if os.path.exists(flask_sqlalchemy_path):
        print(f"Found flask_sqlalchemy in: {flask_sqlalchemy_path}")
        break
else:
    print("flask_sqlalchemy not found in any site-packages")

print("\nChecking pip installations...")
try:
    import subprocess
    result = subprocess.run([sys.executable, '-m', 'pip', 'list', '--format=freeze'],
                          capture_output=True, text=True)
    sqlalchemy_packages = [line for line in result.stdout.split('\n')
                          if 'sqlalchemy' in line.lower()]
    if sqlalchemy_packages:
        print("SQLAlchemy packages installed:")
        for pkg in sqlalchemy_packages:
            print(f"  {pkg}")
    else:
        print("No SQLAlchemy packages found")
except Exception as e:
    print(f"Error checking pip: {e}")

