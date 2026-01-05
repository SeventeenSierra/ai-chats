import json
import os
import sys

# Configuration matches harvester.py
TARGETS_FILE = os.path.join(os.getcwd(), 'scripts', 'extraction', 'targets.json')
OUTPUT_BASE_DIR = os.path.join(os.getcwd(), 'data', 'storage', 'deep_research')

def get_safe_title(title):
    return "".join([c for c in title if c.isalnum() or c in (' ', '-', '_')]).strip()[:64]

def main():
    if not os.path.exists(TARGETS_FILE):
        print(f"Error: {TARGETS_FILE} not found.")
        sys.exit(1)
        
    try:
        with open(TARGETS_FILE, 'r') as f:
            targets = json.load(f)
    except json.JSONDecodeError:
        print(f"Error: Failed to parse {TARGETS_FILE}")
        sys.exit(1)

    pending_targets = []
    
    for target in targets:
        conv_id = target['conversationId']
        title = target.get('title', 'Untitled')
        safe_title = get_safe_title(title)
        
        # Expected directory
        conv_dir = os.path.join(OUTPUT_BASE_DIR, f"{conv_id}_{safe_title}")
        
        # Check if already harvested (checking for HTML file as success indicator)
        html_path = os.path.join(conv_dir, "page_content.html")
        
        if not os.path.exists(html_path):
            pending_targets.append({
                'conversationId': conv_id,
                'title': title,
                'safe_title': safe_title,
                'output_dir': conv_dir
            })

    # Output JSON for easy parsing by the agent
    print(json.dumps(pending_targets, indent=2))

if __name__ == "__main__":
    main()
