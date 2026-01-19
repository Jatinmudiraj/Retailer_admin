import sys
import os

print("--- Reading Log ---")
content = ""
for enc in ['utf-16', 'utf-16le', 'utf-8', 'cp1252']:
    try:
        with open('fatal_error.txt', 'r', encoding=enc) as f:
            content = f.read()
        if "Traceback" in content:
            print(f"Success with {enc}")
            break
    except Exception:
        continue

print(content)
print("--- End Log ---")
