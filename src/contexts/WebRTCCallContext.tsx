/**
 * WebRTCCallContext
 *
 * Lifts WebRTC call state to the app level so:
 *  - Incoming calls are visible on ANY page (not just the DM page)
 *  - The active-call overlay persists while navigating
 *  - DMChatArea just reads from context to initiate / display status
 */

import { createContext, useContext, ReactNode } from 'react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { WebRTCCallUI } from '@/components/WebRTCCallUI';
import { IncomingCallModal } from '@/components/IncomingCallModal';
import type { CallState, CallType, IncomingCallInfo } from '@/hooks/useWebRTCCall';

// ─── Context shape ────────────────────────────────────────────────────────────

interface WebRTCCallContextValue {
  callState: CallState;
  callType: CallType;
  remotePubkey: string | null;
  incomingCall: IncomingCallInfo | null;
  isMuted: boolean;
  isCameraOff: boolean;
  error: string | null;
  startCall: (peerPubkey: string, type: CallType) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  dismissCall: () => void;
  /** Whether a call is active (not idle / ended) */
  callActive: boolean;
}

const WebRTCCallContext = createContext<WebRTCCallContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WebRTCCallProvider({ children }: { children: ReactNode }) {
  const call = useWebRTCCall();

  const callActive = call.callState !== 'idle' && call.callState !== 'ended';
  const showCallUI  = callActive && call.callState !== 'receiving';
  const showIncoming = call.callState === 'receiving' && !!call.incomingCall;

  const value: WebRTCCallContextValue = {
    callState:    call.callState,
    callType:     call.callType,
    remotePubkey: call.remotePubkey,
    incomingCall: call.incomingCall,
    isMuted:      call.isMuted,
    isCameraOff:  call.isCameraOff,
    error:        call.error,
    startCall:    call.startCall,
    hangUp:       call.hangUp,
    toggleMute:   call.toggleMute,
    toggleCamera: call.toggleCamera,
    dismissCall:  call.dismissCall,
    callActive,
  };

  return (
    <WebRTCCallContext.Provider value={value}>
      {children}

      {/* ── Global incoming-call modal (shown on any page) ── */}
      {showIncoming && call.incomingCall && (
        <IncomingCallModal
          call={call.incomingCall}
          onAccept={call.acceptCall}
          onReject={call.rejectCall}
        />
      )}

      {/* ── Global active-call overlay (shown on any page) ── */}
      {showCallUI && call.remotePubkey && (
        <WebRTCCallUI
          callState={call.callState}
          callType={call.callType}
          remotePubkey={call.remotePubkey}
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          isMuted={call.isMuted}
          isCameraOff={call.isCameraOff}
          onToggleMute={call.toggleMute}
          onToggleCamera={call.toggleCamera}
          onHangUp={call.hangUp}
        />
      )}
    </WebRTCCallContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCCallContext(): WebRTCCallContextValue {
  const ctx = useContext(WebRTCCallContext);
  if (!ctx) throw new Error('useWebRTCCallContext must be used inside WebRTCCallProvider');
  return ctx;
}
