"""Browser regressions for the real hero controller (requires Playwright, Chromium, ffmpeg)."""
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import subprocess
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'site.js').read_text()
controller = source[source.index('const heroVideo='):source.index('const menuBtn=')]
markup = (ROOT / 'index.html').read_text()
start = markup.index('<section class="hero hero-video-only">')
hero = markup[start:markup.index('</section>', start) + len('</section>')]
fixture = ('<!doctype html><html lang="en"><head><link rel="stylesheet" href="/styles.css"></head>'
           '<body style="margin:0">' + hero + '<div style="height:2500px"></div>'
           '<script src="/hero.js"></script></body></html>')

with TemporaryDirectory(prefix='hero-video-test-') as scratch:
    clip_path = Path(scratch) / 'clip.mp4'
    subprocess.run(['ffmpeg', '-f', 'lavfi', '-i', 'color=black:s=32x32:d=2', '-an',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    '-loglevel', 'error', str(clip_path)], check=True)
    clip = clip_path.read_bytes()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
                                    headless=True, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])

        def scenario(name, *, mobile=False, reduced=False, save_data=False):
            context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 720},
                                          reduced_motion='reduce' if reduced else 'no-preference')
            context.add_init_script('''(() => {
              const connection = new EventTarget(); connection.saveData = %s;
              Object.defineProperty(navigator, 'connection', {value: connection});
              window.__hidden = false;
              Object.defineProperty(document, 'hidden', {get: () => window.__hidden});
            })();''' % ('true' if save_data else 'false'))
            requests = []

            def route(request):
                url = request.request.url
                if '/site/' in url and '.mp4' in url:
                    requests.append(url)
                    request.fulfill(status=200, content_type='video/mp4', body=clip)
                elif url.endswith('/hero.js'):
                    request.fulfill(status=200, content_type='application/javascript', body=controller)
                elif url.endswith('/styles.css'):
                    request.fulfill(status=200, content_type='text/css', body=(ROOT / 'styles.css').read_text())
                elif '/site/' in url:
                    request.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')
                else:
                    request.fulfill(status=200, content_type='text/html', body=fixture)

            context.route('**/*', route)
            page = context.new_page()
            page.set_default_timeout(10000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://hero.test/', wait_until='load')
            video = page.locator('video')
            page.wait_for_timeout(1800)  # Include the previous unconditional retry interval.
            if reduced or save_data:
                assert video.get_attribute('src') is None, name
                assert requests == [], (name, requests)
                assert page.locator('#heroSoundToggle').get_attribute('aria-label') == 'Play video', name
                assert page.locator('#heroSoundToggle > span').first.is_visible(), name
                page.evaluate('''() => {
                  const video = document.querySelector('video');
                  for (const event of ['canplay', 'ended', 'error']) video.dispatchEvent(new Event(event));
                }''')
                page.set_viewport_size({'width': 1200 if mobile else 390, 'height': 720})
                page.wait_for_timeout(1700)
                assert video.get_attribute('src') is None and requests == [], (name, requests)
                page.locator('#heroSoundToggle').click()
                page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')
                assert len(requests) >= 1, name
            else:
                expected = 'hero-mobile.mp4' if mobile else 'hero-desktop.mp4'
                assert expected in video.get_attribute('src'), (name, video.get_attribute('src'))
                page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')
                assert not video.evaluate('(video) => video.muted'), name
                page.locator('#heroSoundToggle').click()
                assert video.evaluate('(video) => video.muted'), name
                page.locator('#heroSoundToggle').click()
                assert not video.evaluate('(video) => video.muted'), name
                page.set_viewport_size({'width': 1280 if mobile else 390, 'height': 720})
                next_source = 'hero-desktop.mp4' if mobile else 'hero-mobile.mp4'
                page.wait_for_function('(source) => document.querySelector("video").getAttribute("src").includes(source)', arg=next_source)
                page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')

            # Honour pauses from browser/OS media controls across every automatic path.
            page.evaluate('document.querySelector("video").pause()')
            page.wait_for_function('document.querySelector("#heroSoundToggle").getAttribute("aria-label") === "Play video"')
            count = len(requests)
            page.evaluate('''() => {
              const video = document.querySelector('video');
              for (const event of ['canplay', 'ended', 'error']) video.dispatchEvent(new Event(event));
              window.dispatchEvent(new Event('resize'));
            }''')
            page.wait_for_timeout(1700)
            assert video.evaluate('(video) => video.paused'), name + ' user pause'
            assert len(requests) == count, name + ' paused video caused a fetch'
            page.locator('#heroSoundToggle').click()
            page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')

            # Native media events and the retry timer must not resume a hidden page.
            page.evaluate('''() => {
              window.__hidden = true; document.dispatchEvent(new Event('visibilitychange'));
              const video = document.querySelector('video');
              for (const event of ['canplay', 'ended']) video.dispatchEvent(new Event(event));
            }''')
            page.wait_for_timeout(1700)
            assert video.evaluate('(video) => video.paused'), name + ' hidden'
            page.evaluate("window.__hidden = false; document.dispatchEvent(new Event('visibilitychange'))")
            page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')

            # Leaving the viewport pauses playback; returning resumes an allowed video.
            page.evaluate('window.scrollTo(0, 1800)')
            page.wait_for_function('document.querySelector("video").paused')
            page.evaluate('document.querySelector("video").dispatchEvent(new Event("canplay"))')
            page.wait_for_timeout(1700)
            assert video.evaluate('(video) => video.paused'), name + ' offscreen'
            page.evaluate('window.scrollTo(0, 0)')
            page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')

            # A newly enabled user preference takes effect without reload.
            if not reduced and not save_data:
                count = len(requests)
                page.evaluate("navigator.connection.saveData=true; navigator.connection.dispatchEvent(new Event('change'))")
                page.wait_for_timeout(1700)
                assert video.get_attribute('src') is None, name + ' changed preference'
                assert len(requests) == count, name + ' preference caused a fetch'
                page.locator('#heroSoundToggle').click()
                page.wait_for_function('!document.querySelector("video").paused && document.querySelector("video").readyState >= 2')
            assert errors == [], (name, errors)
            context.close()
            print('PASS', name, flush=True)

        scenario('normal desktop')
        scenario('normal mobile', mobile=True)
        scenario('reduced motion', reduced=True)
        scenario('saveData mobile', mobile=True, save_data=True)
        browser.close()
