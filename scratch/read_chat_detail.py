import json

paths = [
    r"C:\Users\gerla\.gemini\antigravity-ide\brain\dbf40747-53f4-429c-817a-c9a15898317c\.system_generated\logs\transcript.jsonl",
    r"C:\Users\gerla\.gemini\antigravity-ide\brain\a6571dce-6e56-4b40-baa7-2020220fda3f\.system_generated\logs\transcript.jsonl",
    r"C:\Users\gerla\.gemini\antigravity-ide\brain\772c6810-a56c-4751-9dd8-8c8d200619cd\.system_generated\logs\transcript.jsonl"
]

for path in paths:
    print(f"--- PATH: {path} ---")
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f.readlines():
                data = json.loads(line)
                if data.get("type") in ["USER_INPUT", "PLANNER_RESPONSE", "MODEL"]:
                    content = data.get("content", "")
                    # look for keywords
                    if any(x in content.lower() for x in ["symlink", "enlace", "ln -s", "crmv2", "trackerv2", "public_html"]):
                        print(f"[{data.get('type')}]: {content[:300]}...\n")
    except Exception as e:
        print(f"Error: {e}")
