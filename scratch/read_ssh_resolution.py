import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = r"C:\Users\gerla\.gemini\antigravity-ide\brain\dbf40747-53f4-429c-817a-c9a15898317c\.system_generated\logs\transcript.jsonl"
print(f"--- PATH: {path} ---")
try:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f.readlines():
            data = json.loads(line)
            if data.get("type") in ["USER_INPUT", "PLANNER_RESPONSE", "MODEL"]:
                content = data.get("content", "")
                if "ssh" in content.lower():
                    print(f"[{data.get('type')}]: {content[:400]}...\n")
except Exception as e:
    print(f"Error: {e}")
