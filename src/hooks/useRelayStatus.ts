import { useEffect, useRef, useState } from 'react';

export type RelayStatus = 'connecting' | 'connected' | 'error';

/**
 * Opens a WebSocket to the given relay URL and tracks its connection status.
 *
 * - 'connecting' — socket is opening (initial state)
 * - 'connected'  — socket opened successfully (ws handshake OK)
 * - 'error'      — socket failed to open or closed with an error
 *
 * The socket is closed and cleaned up when the component unmounts or the url
 * changes.  We intentionally use a bare WebSocket rather than going through
 * Nostrify so this is a pure connectivity probe with no side-effects on the
 * rest of the app.
 */
export function useRelayStatus(url: string): RelayStatus {
  const [status, setStatus] = useState<RelayStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setStatus('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // URL was unparseable as a WebSocket URL
      setStatus('error');
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => setStatus('connected');

    ws.onerror = () => setStatus('error');

    // A clean close after a successful open keeps the last 'connected' state.
    // A close before open (i.e. connection refused) shows 'error'.
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1001) {
        // Abnormal close — treat as error only if we never connected
        setStatus((prev) => (prev === 'connecting' ? 'error' : prev));
      }
    };

    return () => {
      ws.onopen = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  return status;
}
