import json
import os
import sys
import argparse
import time
from playwright.sync_api import sync_playwright

# Configuration
DEFAULT_DATA_DIR = os.path.join(os.getcwd(), 'data', 'browser_context')
TARGETS_FILE = os.path.join(os.getcwd(), 'scripts', 'extraction', 'targets.json')
OUTPUT_BASE_DIR = os.path.join(os.getcwd(), 'data', 'storage', 'deep_research')

def ensure_targets():
    if not os.path.exists(TARGETS_FILE):
        print(f"Error: {TARGETS_FILE} not found. Run discover_chips.js first.")
        sys.exit(1)
    with open(TARGETS_FILE, 'r') as f:
        return json.load(f)

def run_harvester(args):
    targets = ensure_targets()
    print(f"Loaded {len(targets)} targets.")
    
    # Create output directory
    if not os.path.exists(OUTPUT_BASE_DIR):
        os.makedirs(OUTPUT_BASE_DIR)

    with sync_playwright() as p:
        print(f"Launching browser (Headless: {args.headless})...")
        
        context = p.chromium.launch_persistent_context(
            user_data_dir=args.data_dir,
            headless=args.headless,
            channel="chrome", 
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 1024}
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        try:
            # 1. Login Check
            print("Checking login status...")
            page.goto("https://gemini.google.com/app")
            
            # Wait loop for correct domain and app load
            while "accounts.google.com" in page.url or "Sign in" in page.title() or "Login" in page.title():
                print(f"⚠️  Current URL: {page.url}")
                print("   Please sign in/complete verify in the browser window.")
                time.sleep(3)
                try:
                    # Check if we are back on gemini
                    if "gemini.google.com" in page.url and "accounts.google.com" not in page.url:
                        break
                except:
                    pass
            
            print("✅  Hostname match (gemini.google.com). Waiting for app shell...")
            try:
                # Wait for something characteristic of the app (e.g., chat history or input)
                # 'textarea' is usually the prompt input
                page.wait_for_selector("textarea", timeout=30000) 
                print("✅  App shell loaded. Proceeding...")
            except:
                print("⚠️  Timed out waiting for app shell (textarea). Proceeding anyway, but verify login.")

            time.sleep(2)

            # 2. Harvesting Loop
            for i, target in enumerate(targets):
                conv_id = target['conversationId']
                safe_title = "".join([c for c in target['title'] if c.isalnum() or c in (' ', '-', '_')]).strip()[:64]
                
                # Skip if already harvested? (Optional logic)
                conv_dir = os.path.join(OUTPUT_BASE_DIR, f"{conv_id}_{safe_title}")
                if not os.path.exists(conv_dir):
                    os.makedirs(conv_dir)
                
                url = f"https://gemini.google.com/app/{conv_id}"
                print(f"[{i+1}/{len(targets)}] Visiting {target['title']} ({conv_id})...")
                
                try:
                    page.goto(url)
                    page.wait_for_load_state("networkidle")
                    time.sleep(3) # Allow JS to hydrate

                    # --- RE-LOGIN CHECK ---
                    if "accounts.google.com" in page.url or "Sign in" in page.title():
                        print(f"🚨  Redirected to Login page! Please sign in manually in the browser window.")
                        while "accounts.google.com" in page.url or "Sign in" in page.title():
                            time.sleep(1)
                        print("✅  Login restored. Waiting for app...")
                        page.wait_for_selector("textarea", timeout=30000)
                        time.sleep(2)
                    # ----------------------

                    if "404" in page.title() or "Error" in page.title():
                        print("  ❌ Page not found or error.")
                        continue
                    
                    # 3. Smart Scanning for Deep Research
                    # Heuristic: deep research often appears in specific containers.
                    # We will look for elements that might represent chips or cards.
                    
                    # A. Expand 'Thinking' blocks if they exist (Deep Research usually has them)
                    # Selector Guess: looking for buttons with "Show thinking" or similar text
                    expand_buttons = page.get_by_role("button", name="Show thinking").all()
                    if expand_buttons:
                        print(f"  Found {len(expand_buttons)} 'Thinking' sections. Expanding...")
                        for btn in expand_buttons:
                            try:
                                if btn.is_visible():
                                    btn.click()
                                    time.sleep(0.5)
                            except:
                                pass
                    
                    # B. Locate Deep Research Cards
                    # Selector Guess: Look for article-like containers or specific text
                    # We will snapshot the whole page likely, but also try to identify specific artifacts.
                    
                    # For Phase 1 Verification: Take a full page screenshot
                    screenshot_path = os.path.join(conv_dir, "full_page.png")
                    page.screenshot(path=screenshot_path, full_page=True)
                    print(f"  📸 Saved screenshot: {screenshot_path}")

                    # C. Save HTML
                    html_path = os.path.join(conv_dir, "page_content.html")
                    with open(html_path, "w", encoding="utf-8") as f:
                        f.write(page.content())
                    print(f"  📄 Saved HTML: {html_path}")
                    
                except Exception as e:
                    print(f"  ❌ Error processing {conv_id}: {e}")
                    # Save screenshot on error
                    try:
                        page.screenshot(path=os.path.join(OUTPUT_BASE_DIR, f"error_{conv_id}.png"))
                    except:
                        pass

            if not args.headless:
                print("\nDone. Press Enter to close browser...")
                input()
        
        except KeyboardInterrupt:
            print("\n🛑 Execution stopped by user.")
        except Exception as e:
            print(f"\n❌ Critical Error: {e}")
        finally:
            print("Closing browser context (saving session)...")
            context.close()

def main():
    parser = argparse.ArgumentParser(description="Gemini Deep Research Harvester")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="Path to browser user data directory")
    
    args = parser.parse_args()
    
    # Ensure data dir exists
    if not os.path.exists(args.data_dir):
        os.makedirs(args.data_dir)

    run_harvester(args)

if __name__ == "__main__":
    main()
