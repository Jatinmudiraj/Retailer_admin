
import os

parts = ['part1.py', 'part2.py', 'part3.py', 'part4.py']
output_file = 'app/main.py'

print(f"Combining {parts} into {output_file}...")

with open(output_file, 'w', encoding='utf-8') as outfile:
    for fname in parts:
        if os.path.exists(fname):
            with open(fname, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
                outfile.write('\n\n')
            print(f"Appended {fname}")
        else:
            print(f"Warning: {fname} not found!")

print("Done. Cleaning up parts...")
for fname in parts:
    if os.path.exists(fname):
        os.remove(fname)
print("Cleanup complete.")
