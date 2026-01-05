
from playwright.sync_api import sync_playwright

def run():
    print("Launching Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://google.com")
        print(f"Title: {page.title()}")
        browser.close()
    print("Playwright Verified.")

if __name__ == "__main__":
    run()
