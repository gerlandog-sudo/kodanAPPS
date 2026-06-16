import os
import json
from datetime import datetime

brain_dir = r"C:\Users\gerla\.gemini\antigravity-ide\brain"

matches = []
for root, dirs, files in os.walk(brain_dir):
    for file in files:
        if file == "transcript.jsonl":
            path = os.path.join(root, file)
            try:
                mtime = os.path.getmtime(path)
                mtime_dt = datetime.fromtimestamp(mtime)
                
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    
                content_text = "".join(lines)
                # Let's match any keyword that might be relevant
                if any(x in content_text for x in ["kodanAPPS", "deploy.yml", "SSH", "cpanel", "deploy"]):
                    matches.append((mtime_dt, path, len(lines)))
            except Exception as e:
                pass

print(f"Total transcripts matching: {len(matches)}")

# Sort by modification time descending
matches.sort(key=lambda x: x[0], reverse=True)

for dt, path, num_lines in matches[:15]:
    # Extract conversation ID from path
    parts = path.split(os.sep)
    conv_id = "unknown"
    for part in parts:
        if len(part) == 36 and part.count("-") == 4:
            conv_id = part
            break
            
    print(f"ModTime: {dt.isoformat()} | Lines: {num_lines} | ConvID: {conv_id}")
    # Print the last few user messages in this transcript if possible
    try:
        user_inputs = []
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f.readlines():
                try:
                    data = json.loads(line)
                    if data.get("type") == "USER_INPUT":
                        user_inputs.append(data.get("content", ""))
                except:
                    pass
        if user_inputs:
            for inp in user_inputs[-2:]:
                content = inp
                if len(content) > 120:
                    content = content[:120] + "..."
                print(f"  User Input: {content}")
    except Exception as e:
        print(f"  Error reading input: {e}")
