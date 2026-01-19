try:
    with open('crash.log', 'r') as f:
        lines = f.readlines()
        print("--- Start Log ---")
        for line in lines:
            if "Traceback" in line or "Error" in line or "File" in line:
                print(line.strip())
        print("--- End Log ---")
except Exception as e:
    print(e)
