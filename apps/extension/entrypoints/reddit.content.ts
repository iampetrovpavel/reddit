import type { FullArticle, Post, ServerMessage } from '@redit/shared';

const WS_PORT = (import.meta as any).env?.WXT_WS_PORT ?? '3100';
const SESSION_KEY = 'redit_state';

export default defineContentScript({
  matches: ['*://*.reddit.com/*'],
  main() {
    if (window.location.pathname.includes('/comments/')) {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        sessionStorage.removeItem(SESSION_KEY);
        try {
          const { sessionId: sid } = JSON.parse(raw) as { sessionId: string };
          if (sid) { runCommentMode(sid); return; }
        } catch { /* ignore */ }
      }
      browser.runtime.onMessage.addListener((message: { type: string }) => {
        if (message.type === 'REPLY_TO_REPLIES') handleReplyToReplies();
      });
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let cooldownTimerId: ReturnType<typeof setTimeout> | null = null;
    let seenPostIds = new Set<string>();
    let mutationObserver: MutationObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let ws: WebSocket | null = null;
    let sessionId: string | null = null;
    let currentArticle: Element | null = null;
    let currentPost: Post | null = null;
    let waitingForCommand = false;
    let COOLDOWN_S = 600;

    function rand(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function scheduleNext() {
      timerId = setTimeout(() => {
        const r = Math.random();
        let dy: number;
        if (r < 0.08) {
          dy = -rand(20, 60);
        } else if (r < 0.23) {
          dy = rand(400, 700);
        } else {
          dy = rand(80, 300);
        }
        window.scrollBy({ top: dy, behavior: 'smooth' });
        scheduleNext();
      }, rand(400, 1500));
    }

    function extractPost(article: Element): Post {
      return {
        postId: article.getAttribute('data-post-id') ?? '',
        title: article.getAttribute('aria-label') ?? '',
        url: article.querySelector<HTMLAnchorElement>('a[slot="full-post-link"], a[href*="/comments/"]')?.href ?? window.location.href,
        imageUrl:
          article.querySelector<HTMLImageElement>(
            '[slot="post-media-container"] img, [data-testid="post-thumbnail"] img'
          )?.src ?? null,
      };
    }

    function handleCommand(command: 'scroll' | 'like' | 'open') {
      waitingForCommand = false;
      if (command === 'like') {
        const postId = currentPost?.postId;
        console.log('[redit] liking:', currentPost?.title);
        const script = document.createElement('script');
        script.textContent = `(function() {
  function findInShadow(root, selector) {
    var found = root.querySelector(selector);
    if (found) return found;
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var sr = all[i].shadowRoot;
      if (sr) { found = findInShadow(sr, selector); if (found) return found; }
    }
    return null;
  }
  var article = document.querySelector('article[data-post-id="${postId}"]');
  if (!article) { console.warn('[redit-page] article not found', '${postId}'); return; }
  var btn = findInShadow(article, 'button[data-action-bar-action="upvote"]');
  if (!btn) { console.warn('[redit-page] upvote btn not found in shadow', '${postId}'); return; }
  console.log('[redit-page] clicking upvote, aria-pressed:', btn.getAttribute('aria-pressed'));
  btn.click();
  setTimeout(function() {
    console.log('[redit-page] after click aria-pressed:', btn.getAttribute('aria-pressed'));
  }, 300);
})();`;
        document.documentElement.appendChild(script);
        script.remove();
      } else if (command === 'open' && currentPost) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId }));
        window.location.href = currentPost.url;
        return;
      }
      currentArticle = null;
      currentPost = null;
      scheduleNext();
    }

    function sendPost(article: Element) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!sessionId) return;
      if (waitingForCommand) return;
      const post = extractPost(article);
      if (!post.postId || seenPostIds.has(post.postId)) return;
      seenPostIds.add(post.postId);

      currentArticle = article;
      currentPost = post;
      waitingForCommand = true;

      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }

      ws.send(JSON.stringify({ type: 'post_seen', post }));
    }

    function observeArticle(article: Element) {
      intersectionObserver?.observe(article);
    }

    function startObserver() {
      const feed = document.querySelector('shreddit-feed');
      if (!feed) return;

      intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          sendPost(entry.target);
          intersectionObserver?.unobserve(entry.target);
        }
      }, { threshold: 0.1 });

      for (const article of feed.querySelectorAll<Element>('article')) {
        observeArticle(article);
      }

      mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            const articles =
              node.tagName.toLowerCase() === 'article'
                ? [node]
                : Array.from(node.querySelectorAll<Element>('article'));
            for (const article of articles) {
              observeArticle(article);
            }
          }
        }
      });
      mutationObserver.observe(feed, { childList: true, subtree: true });
    }

    function stopObserver() {
      mutationObserver?.disconnect();
      mutationObserver = null;
      intersectionObserver?.disconnect();
      intersectionObserver = null;
      seenPostIds.clear();
    }

    function extractArticle(): FullArticle {
      const title = document.querySelector('shreddit-post h1[slot="title"]')?.textContent?.trim() ?? '';
      const bodyParagraphs = Array.from(
        document.querySelectorAll<HTMLElement>('shreddit-post-text-body div[id*="post-rtjson-content"] p')
      );
      const body = bodyParagraphs.map(p => p.textContent?.trim() ?? '').filter(Boolean).join('\n');
      const author = document.querySelector('shreddit-post')?.getAttribute('author') ?? '';
      const comments = Array.from(
        document.querySelectorAll<Element>('shreddit-comment[depth="0"]')
      ).slice(0, 5).map(el => ({
        author: el.getAttribute('author') ?? '',
        text: Array.from(
          el.querySelectorAll<HTMLElement>('div[slot="comment"] div[id*="post-rtjson-content"] p')
        ).map(p => p.textContent?.trim() ?? '').filter(Boolean).join('\n'),
      }));
      return { title, body, author, comments };
    }

    function waitForComposer(maxMs: number): Promise<HTMLElement | null> {
      return new Promise(resolve => {
        const deadline = Date.now() + maxMs;
        const check = () => {
          const el = document.querySelector<HTMLElement>(
            'shreddit-composer div[slot="rte"][contenteditable="true"]'
          );
          if (el && el.offsetHeight > 0) return resolve(el);
          if (el && Date.now() >= deadline) return resolve(el);
          if (!el && Date.now() >= deadline) return resolve(null);
          setTimeout(check, 100);
        };
        check();
      });
    }

    function dismissDraftDialog() {
      const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button'));
      const discard = allButtons.find(b => /discard/i.test(b.textContent ?? ''))
        ?? allButtons.find(b => /don.t save/i.test(b.textContent ?? ''))
        ?? allButtons.find(b => /cancel/i.test(b.textContent ?? '') && b.closest('[role="dialog"], rpl-dialog-sheet, rpl-bottom-sheet'));
      discard?.click();
    }

    function runCommentMode(storedSessionId: string) {
      const socket = new WebSocket(`ws://localhost:${WS_PORT}`);
      socket.onerror = (e) => console.error('[redit] ws error', e);
      socket.onclose = () => {};

      socket.onopen = () => {
        const send = () => {
          const article = extractArticle();
          socket.send(JSON.stringify({ type: 'article_seen', sessionId: storedSessionId, article }));
        };
        if (document.readyState === 'complete') {
          send();
        } else {
          window.addEventListener('load', send, { once: true });
        }
      };

      socket.onmessage = (e: MessageEvent) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(e.data) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type !== 'comment') return;

        const postAndBack = async (text: string) => {
          if (!text) return;

          await new Promise(r => setTimeout(r, rand(1000, 2500)));

          const composerHost = document.querySelector<HTMLElement>('comment-composer-host');
          if (composerHost) {
            composerHost.classList.remove('nd:hidden');
            composerHost.style.display = 'block';

            const form = composerHost.querySelector<HTMLElement>('faceplate-form[slot="ready"]');
            if (form) form.removeAttribute('slot');

            const sr = composerHost.shadowRoot;
            const sheet = sr?.querySelector('rpl-dialog-sheet, RPL-DIALOG-SHEET') as HTMLElement | null;
            if (sheet) {
              sheet.setAttribute('open', '');
              sheet.style.setProperty('display', 'block', 'important');
            }
          }

          const shredditComposer = document.querySelector('shreddit-composer');
          const composerSr = (shredditComposer as Element & { shadowRoot: ShadowRoot | null })?.shadowRoot;
          if (composerSr) {
            composerSr.querySelectorAll<HTMLElement>('*').forEach(el => {
              const cs = window.getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden') {
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
              }
            });
          }

          const composer = await waitForComposer(10000);
          if (!composer) return;

          await new Promise(r => setTimeout(r, 400));
          dismissDraftDialog();
          await new Promise(r => setTimeout(r, 200));

          const p = composer.querySelector('p') ?? composer;

          await new Promise(r => setTimeout(r, 400));

          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
            composer.focus();
            resolve();
          })));

          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(p);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }

          // execCommand is blocked in Firefox content scripts — inject a <script>
          // that runs in the page context where execCommand works normally
          await new Promise<void>((resolve, reject) => {
            const doneEvent = 'redit_typed_' + Date.now();
            const failEvent = 'redit_fail_' + Date.now();

            window.addEventListener(doneEvent, () => resolve(), { once: true });
            window.addEventListener(failEvent, (e) => reject(new Error((e as CustomEvent).detail)), { once: true });

            const script = document.createElement('script');
            script.textContent = `(function() {
  var el = document.querySelector('shreddit-composer div[slot="rte"][contenteditable="true"]');
  if (!el) { window.dispatchEvent(new CustomEvent(${JSON.stringify(failEvent)}, {detail:'no-el'})); return; }
  el.focus();
  var sel = window.getSelection();
  if (sel) {
    var p = el.querySelector('p') || el;
    var range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  var chars = ${JSON.stringify(Array.from(text))};
  var i = 0;
  function typeNext() {
    if (i >= chars.length) {
      window.dispatchEvent(new CustomEvent(${JSON.stringify(doneEvent)}));
      return;
    }
    document.execCommand('insertText', false, chars[i++]);
    setTimeout(typeNext, 30 + Math.floor(Math.random() * 80));
  }
  typeNext();
})();`;
            document.documentElement.appendChild(script);
            script.remove();
          });

          await new Promise(r => setTimeout(r, rand(400, 900)));

          const submitBtn = document.querySelector<HTMLElement>('#comment-composer-submit-button');
          submitBtn?.click();

          await new Promise(r => setTimeout(r, 3000));
          const clearScript = document.createElement('script');
          clearScript.textContent = `(function() {
  var el = document.querySelector('shreddit-composer div[slot="rte"][contenteditable="true"]');
  if (!el) return;
  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
})();`;
          document.documentElement.appendChild(clearScript);
          clearScript.remove();

          await new Promise(r => setTimeout(r, 300));
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: storedSessionId, mode: 'resume' }));
          history.back();
        };

        postAndBack(msg.text)
          .catch(err => console.error('[redit] postAndBack error', err))
          .finally(() => socket.close(1000));
      };
    }

    function openWs(): WebSocket {
      const socket = new WebSocket(`ws://localhost:${WS_PORT}`);
      socket.onclose = () => {};
      socket.onerror = (e) => console.error('[redit] ws error', e);
      return socket;
    }

    function closeWs() {
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1000);
      }
      ws = null;
    }

    // returning from article page — resume scroll with the existing session
    const resumeRaw = sessionStorage.getItem(SESSION_KEY);
    if (resumeRaw) {
      sessionStorage.removeItem(SESSION_KEY);
      try {
        const stored = JSON.parse(resumeRaw) as { sessionId?: string; mode?: string };
        if (stored.sessionId && stored.mode === 'resume') {
          ws = openWs();
          ws.onopen = () => {
            sessionId = stored.sessionId!;
            browser.runtime.sendMessage({ type: 'COOLDOWN_START', duration: COOLDOWN_S }).catch(() => {});
            cooldownTimerId = setTimeout(() => {
              cooldownTimerId = null;
              browser.runtime.sendMessage({ type: 'COOLDOWN_END' }).catch(() => {});
              startObserver();
              scheduleNext();
            }, COOLDOWN_S * 1000);
          };
          ws.onmessage = (e: MessageEvent) => {
            let msg: ServerMessage;
            try { msg = JSON.parse(e.data) as ServerMessage; } catch { return; }
            if (msg.type === 'command') handleCommand(msg.command);
          };
        }
      } catch { /* ignore */ }
    }

    browser.runtime.onMessage.addListener((message: { type: string }) => {
      if (message.type === 'START_SCROLL') {
        ws = openWs();
        ws.onopen = () => {
          ws!.send(JSON.stringify({ type: 'new_session', systemPromptPath: 'default' }));
          startObserver();
        };
        ws.onmessage = (e: MessageEvent) => {
          let msg: ServerMessage;
          try {
            msg = JSON.parse(e.data) as ServerMessage;
          } catch {
            return;
          }
          if (msg.type === 'session_created') {
            sessionId = msg.sessionId;
            if (typeof msg.cooldownS === 'number' && msg.cooldownS > 0) COOLDOWN_S = msg.cooldownS;
            scheduleNext();
          } else if (msg.type === 'command') {
            handleCommand(msg.command);
          }
        };
        ws.onclose = () => {
          if (waitingForCommand) {
            console.warn('[redit] ws closed while waiting for command — resetting');
            waitingForCommand = false;
            currentPost = null;
            currentArticle = null;
            scheduleNext();
          }
        };
      } else if (message.type === 'STOP_SCROLL') {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        if (cooldownTimerId) {
          clearTimeout(cooldownTimerId);
          cooldownTimerId = null;
          browser.runtime.sendMessage({ type: 'COOLDOWN_END' }).catch(() => {});
        }
        stopObserver();
        closeWs();
        sessionId = null;
        currentArticle = null;
        currentPost = null;
        waitingForCommand = false;
      } else if (message.type === 'REPLY_TO_REPLIES') {
        handleReplyToReplies();
      }
    });

    async function handleReplyToReplies() {
      function sendStatus(status: string) {
        browser.runtime.sendMessage({ type: 'REPLY_STATUS', status }).catch(() => {});
      }

      function extractCommentText(el: Element): string {
        return Array.from(
          el.querySelectorAll<HTMLElement>('div[slot="comment"] div[id*="post-rtjson-content"] p')
        ).filter(p => p.closest('shreddit-comment') === el)
         .map(p => p.textContent?.trim() ?? '').filter(Boolean).join('\n');
      }

      // Find bot comment
      const botEl = document.querySelector<Element>('shreddit-comment[author="Right-Programmer6076"]');
      if (!botEl) {
        sendStatus('no-bot-comment');
        return;
      }
      const botThingId = botEl.getAttribute('thingid') ?? '';
      const botComment = extractCommentText(botEl);
      const articleTitle = document.querySelector('shreddit-post h1[slot="title"]')?.textContent?.trim() ?? '';
      const articleBody = Array.from(
        document.querySelectorAll<HTMLElement>('shreddit-post-text-body div[id*="post-rtjson-content"] p')
      ).map(p => p.textContent?.trim() ?? '').filter(Boolean).join('\n');

      // Find first reply
      const replyEl = document.querySelector<Element>(`shreddit-comment[parentid="${botThingId}"]`);
      if (!replyEl) {
        sendStatus('no-replies');
        return;
      }
      const replyThingId = replyEl.getAttribute('thingid') ?? '';
      const replierAuthor = replyEl.getAttribute('author') ?? '';
      const replyText = extractCommentText(replyEl);

      // Connect and send context
      const socket = new WebSocket(`ws://localhost:${WS_PORT}`);
      socket.onerror = () => sendStatus('ws-error');

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'reply_seen',
          articleTitle,
          articleBody,
          botComment,
          replierAuthor,
          replyText,
        }));
      };

      socket.onmessage = async (e: MessageEvent) => {
        let msg: ServerMessage;
        try { msg = JSON.parse(e.data) as ServerMessage; } catch { return; }
        if (msg.type !== 'reply_answer') return;
        socket.close(1000);

        const text = msg.text;
        if (!text) { sendStatus('empty-reply'); return; }

        await new Promise(r => setTimeout(r, rand(800, 1500)));

        // Click the Reply button via page-context script (handles action-row shadow DOM)
        await new Promise<void>(resolve => {
          const script = document.createElement('script');
          script.textContent = `(function() {
  function findReplyBtn(root) {
    var btns = Array.from(root.querySelectorAll('button'));
    var found = btns.find(function(b) { return /^reply$/i.test((b.textContent || '').trim()); });
    if (found) return found;
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        found = findReplyBtn(all[i].shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }
  var row = document.querySelector('shreddit-comment-action-row[comment-id="${replyThingId}"]');
  if (!row) return;
  row.classList.remove('nd:hidden');
  row.style.setProperty('display', 'flex', 'important');
  var btn = findReplyBtn(row);
  if (btn) btn.click();
})();`;
          document.documentElement.appendChild(script);
          script.remove();
          setTimeout(resolve, 800);
        });

        // Wait for contenteditable to appear (composer initializes after button click)
        const composer = await ((): Promise<HTMLElement | null> => {
          return new Promise(resolve => {
            const deadline = Date.now() + 10000;
            const check = () => {
              const el = document.querySelector<HTMLElement>(
                `comment-composer-host[parent-id="${replyThingId}"] div[slot="rte"][contenteditable="true"]`
              );
              if (el && el.offsetHeight > 0) return resolve(el);
              if (Date.now() >= deadline) return resolve(null);
              setTimeout(check, 100);
            };
            check();
          });
        })();

        if (!composer) { sendStatus('composer-timeout'); return; }

        await new Promise(r => setTimeout(r, 400));
        dismissDraftDialog();
        await new Promise(r => setTimeout(r, 200));

        // Focus and position cursor
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
          composer.focus();
          resolve();
        })));

        const sel = window.getSelection();
        if (sel) {
          const p = composer.querySelector('p') ?? composer;
          const range = document.createRange();
          range.selectNodeContents(p);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        // Type via injected script scoped to this composer host
        await new Promise<void>((resolve, reject) => {
          const doneEvent = 'redit_reply_typed_' + Date.now();
          const failEvent = 'redit_reply_fail_' + Date.now();

          window.addEventListener(doneEvent, () => resolve(), { once: true });
          window.addEventListener(failEvent, (e) => reject(new Error((e as CustomEvent).detail)), { once: true });

          const script = document.createElement('script');
          script.textContent = `(function() {
  var host = document.querySelector('comment-composer-host[parent-id="${replyThingId}"]');
  var el = host && host.querySelector('div[slot="rte"][contenteditable="true"]');
  if (!el) { window.dispatchEvent(new CustomEvent(${JSON.stringify(failEvent)}, {detail:'no-el'})); return; }
  el.focus();
  var sel = window.getSelection();
  if (sel) {
    var p = el.querySelector('p') || el;
    var range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  var chars = ${JSON.stringify(Array.from(text))};
  var i = 0;
  function typeNext() {
    if (i >= chars.length) {
      window.dispatchEvent(new CustomEvent(${JSON.stringify(doneEvent)}));
      return;
    }
    document.execCommand('insertText', false, chars[i++]);
    setTimeout(typeNext, 30 + Math.floor(Math.random() * 80));
  }
  typeNext();
})();`;
          document.documentElement.appendChild(script);
          script.remove();
        });

        await new Promise(r => setTimeout(r, rand(400, 900)));

        // Submit button lives inside shadow DOM — inject into page context to find it
        const submitted = await new Promise<boolean>(resolve => {
          const script = document.createElement('script');
          script.textContent = `(function() {
  function findSubmit(root) {
    var el = root.querySelector('#comment-composer-submit-button, button[type="submit"]');
    if (el) return el;
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        el = findSubmit(all[i].shadowRoot);
        if (el) return el;
      }
    }
    return null;
  }
  var host = document.querySelector('comment-composer-host[parent-id="${replyThingId}"]');
  var btn = host ? findSubmit(host) : findSubmit(document);
  if (btn) { btn.click(); window.dispatchEvent(new CustomEvent('redit_submit_ok')); }
  else { window.dispatchEvent(new CustomEvent('redit_submit_miss')); }
})();`;
          window.addEventListener('redit_submit_ok', () => resolve(true), { once: true });
          window.addEventListener('redit_submit_miss', () => resolve(false), { once: true });
          document.documentElement.appendChild(script);
          script.remove();
        });

        console.log('[redit] submit btn found:', submitted);
        await new Promise(r => setTimeout(r, 1000));
        sendStatus('done');
      };
    }
  },
});
