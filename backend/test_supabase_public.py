import requests
from urllib.parse import quote

# Replace with your actual Supabase URL + path
SUPABASE_PROJECT_URL = "https://fnrtdpztqorlxobnjupz.supabase.co"
BUCKET = "reference-images"

image_paths = [
    "setters/setter1.png",
    "setters/setter2.png",
    "setters/setter3.png"
]

def build_url(path):
    encoded_path = quote(path, safe="/")
    return f"{SUPABASE_PROJECT_URL}/storage/v1/object/public/{BUCKET}/{encoded_path}"

def test_image(url):
    r = requests.get(url)
    print(f"Testing: {url}")
    print("Status:", r.status_code)
    print("Content-Type:", r.headers.get("content-type", "unknown"))

    if r.status_code == 200:
        print("✅ OK - image accessible\n")
    else:
        print("Response:", r.text)
        print("❌ FAILED\n")

def main():
    for path in image_paths:
        url = build_url(path)
        test_image(url)

if __name__ == "__main__":
    main()
