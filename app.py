import os
import time
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"
CACHE_DURATION = 600  # 10 minutes cache

def get_cached_feed(force_refresh=False):
    """
    Fetch the feed XML, caching it locally to prevent excessive network calls.
    Falls back to cached file if the network request fails.
    """
    now = time.time()
    if not force_refresh and os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        if now - mtime < CACHE_DURATION:
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return f.read(), True
            except Exception:
                pass  # Fallback to fetch if reading fails
                
    try:
        # Fetch fresh feed with a timeout
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.text
        # Write to cache
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        return xml_content, False
    except Exception as e:
        # Fallback to expired cache if we have one
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return f.read(), True
            except Exception:
                pass
        raise e

def parse_xml_feed(xml_data):
    """
    Parse the Atom XML feed. Split each day's entry by h3 headers 
    to extract granular release updates.
    """
    soup = BeautifulSoup(xml_data, 'xml')
    entries = soup.find_all('entry')
    
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find('title').get_text().strip() if entry.find('title') else 'Unknown Date'
        updated_str = entry.find('updated').get_text().strip() if entry.find('updated') else ''
        
        # Alternate link
        link_tag = entry.find('link')
        link = link_tag.get('href') if link_tag else 'https://cloud.google.com/bigquery/docs/release-notes'
        
        # Unique entry ID
        entry_id = entry.find('id').get_text().strip() if entry.find('id') else date_str
        
        # Content (which holds HTML)
        content_tag = entry.find('content')
        content_html = content_tag.get_text() if content_tag else ''
        
        sub_soup = BeautifulSoup(content_html, 'html.parser')
        h3s = sub_soup.find_all('h3')
        
        if not h3s:
            # Fallback if no <h3> headings found
            text_content = sub_soup.get_text(separator=" ").strip()
            text_content = " ".join(text_content.split())
            
            sub_id = f"{entry_id}-0"
            parsed_updates.append({
                'id': sub_id,
                'date': date_str,
                'timestamp': updated_str,
                'type': 'Update',
                'content_html': str(sub_soup),
                'content_text': text_content,
                'link': link
            })
        else:
            # Iterate child tags and split content by <h3>
            current_type = None
            current_elements = []
            update_idx = 0
            
            for child in sub_soup.contents:
                if child.name == 'h3':
                    if current_elements:
                        # Flush the collected elements for the previous section
                        html_str = "".join(str(el) for el in current_elements).strip()
                        text_content = BeautifulSoup(html_str, 'html.parser').get_text(separator=" ").strip()
                        text_content = " ".join(text_content.split())
                        
                        sub_id = f"{entry_id}-{update_idx}"
                        parsed_updates.append({
                            'id': sub_id,
                            'date': date_str,
                            'timestamp': updated_str,
                            'type': current_type or 'Update',
                            'content_html': html_str,
                            'content_text': text_content,
                            'link': f"{link}#{date_str.replace(' ', '_')}"
                        })
                        update_idx += 1
                        current_elements = []
                    current_type = child.get_text().strip()
                else:
                    current_elements.append(child)
            
            if current_elements:
                # Flush the last remaining section
                html_str = "".join(str(el) for el in current_elements).strip()
                text_content = BeautifulSoup(html_str, 'html.parser').get_text(separator=" ").strip()
                text_content = " ".join(text_content.split())
                
                sub_id = f"{entry_id}-{update_idx}"
                parsed_updates.append({
                    'id': sub_id,
                    'date': date_str,
                    'timestamp': updated_str,
                    'type': current_type or 'Update',
                    'content_html': html_str,
                    'content_text': text_content,
                    'link': f"{link}#{date_str.replace(' ', '_')}"
                })
                
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        xml_data, from_cache = get_cached_feed(force_refresh)
        updates = parse_xml_feed(xml_data)
        return jsonify({
            'success': True,
            'from_cache': from_cache,
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Bind to standard local port
    app.run(host='127.0.0.1', port=5000, debug=True)
