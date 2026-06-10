import React, { useEffect, useRef, useState } from 'react';

export default function ParseView() {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const replyResolveRef = useRef<((status: string) => void) | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearCooldown() {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    setCooldown(0);
  }

  useEffect(() => {
    const listener = (message: { type: string; status?: string; duration?: number }) => {
      if (message.type === 'REPLY_STATUS' && replyResolveRef.current) {
        replyResolveRef.current(message.status ?? '');
        replyResolveRef.current = null;
      } else if (message.type === 'COOLDOWN_START') {
        const seconds = message.duration ?? 60;
        clearCooldown();
        setCooldown(seconds);
        cooldownIntervalRef.current = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(cooldownIntervalRef.current!);
              cooldownIntervalRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (message.type === 'COOLDOWN_END') {
        clearCooldown();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  async function handleStart() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null) {
        setStatus('No active tab found.');
        return;
      }
      await browser.tabs.sendMessage(tab.id, { type: 'START_SCROLL' });
      setActiveTabId(tab.id);
      setIsScrolling(true);
      setStatus('Scrolling…');
    } catch (err) {
      setStatus('Failed — reload the Reddit tab and try again.');
      console.error('[redit] handleStart error:', err);
    }
  }

  async function handleStop() {
    if (activeTabId == null) return;
    try {
      await browser.tabs.sendMessage(activeTabId, { type: 'STOP_SCROLL' });
    } catch {
      // tab may have closed
    }
    setIsScrolling(false);
    setActiveTabId(null);
    setStatus('');
    clearCooldown();
  }

  async function handleReply() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null) {
        setReplyStatus('No active tab found.');
        return;
      }
      setIsReplying(true);
      setReplyStatus('Replying...');

      const statusPromise = new Promise<string>(resolve => {
        replyResolveRef.current = resolve;
      });

      await browser.tabs.sendMessage(tab.id, { type: 'REPLY_TO_REPLIES' });

      const result = await statusPromise;
      const messages: Record<string, string> = {
        done: 'Reply posted.',
        'no-bot-comment': 'Bot comment not found on this page.',
        'no-replies': 'No replies to the bot comment yet.',
        'composer-timeout': 'Composer did not open in time.',
        'empty-reply': 'Claude returned an empty reply.',
        'ws-error': 'Could not connect to server.',
      };
      setReplyStatus(messages[result] ?? `Status: ${result}`);
    } catch (err) {
      setReplyStatus('Failed — make sure you are on a Reddit article page.');
      console.error('[redit] handleReply error:', err);
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div>
      <h1>Parse</h1>
      <button onClick={handleStart} disabled={isScrolling}>
        Start Scrolling
      </button>
      <button onClick={handleStop} disabled={!isScrolling}>
        Stop Scrolling
      </button>
      {cooldown > 0 && <p>Cooldown: {cooldown}s</p>}
      {status && <p>{status}</p>}
      <button onClick={handleReply} disabled={isReplying}>
        Reply to Replies
      </button>
      {replyStatus && <p>{replyStatus}</p>}
    </div>
  );
}
