"""Upload course images to the new Bunny Storage account"""
import urllib.request
import os
import sys

ACCESS_KEY = '3be4b875-3735-4125-808d6de40602-b352-43f7'
BASE_URL = 'https://storage.bunnycdn.com/educational-platform-images'

FILES = [
    ('public/tiktok for persenal image.jpg', 'courses/TikTok-For-Personal/cover.jpg'),
    ('public/tiktok for business course image.jpg', 'courses/TikTok-For-Business/cover.jpg'),
]

def upload(local_rel, remote_path):
    local_path = os.path.join(os.getcwd(), local_rel)
    url = f'{BASE_URL}/{remote_path}'
    print(f'Uploading {local_rel} -> {url}')
    
    if not os.path.exists(local_path):
        print(f'  SKIP: File not found: {local_path}')
        return False
    
    with open(local_path, 'rb') as f:
        data = f.read()
    
    req = urllib.request.Request(url, data=data, method='PUT')
    req.add_header('AccessKey', ACCESS_KEY)
    req.add_header('Content-Type', 'image/jpeg')
    
    try:
        with urllib.request.urlopen(req) as resp:
            print(f'  OK! Status: {resp.status}, Size: {len(data)} bytes')
            return True
    except urllib.error.HTTPError as e:
        print(f'  Error: {e.code} - {e.reason}')
        body = e.read().decode()
        print(f'  Body: {body}')
        return False

if __name__ == '__main__':
    success = True
    for local, remote in FILES:
        if not upload(local, remote):
            success = False
    
    if success:
        print('\nAll uploads successful!')
        print('\nNew CDN URLs:')
        print('  TikTok For Personal: https://educational-platform-images.b-cdn.net/courses/TikTok-For-Personal/cover.jpg')
        print('  TikTok For Business: https://educational-platform-images.b-cdn.net/courses/TikTok-For-Business/cover.jpg')
    else:
        print('\nSome uploads failed!')
        sys.exit(1)
