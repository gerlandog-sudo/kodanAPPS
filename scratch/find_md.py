import os

dir_path = r"C:\Users\gerla\.gemini\antigravity-ide\brain\772c6810-a56c-4751-9dd8-8c8d200619cd"
for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".md"):
            print(os.path.join(root, file))
