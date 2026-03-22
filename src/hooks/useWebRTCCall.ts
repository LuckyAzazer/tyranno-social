/**
 * useWebRTCCall
 *
 * Manages a WebRTC peer-to-peer audio/video call between two Nostr users.
 *
 * Signaling is done via NIP-44 encrypted ephemeral events (kind 25050)
 * published to Nostr relays. The signal payload is JSON with a `type` field:
 *   - "call-offer"    : caller sends SDP offer + call metadata
 *   - "call-answer"   : callee sends SDP answer
 *   - "call-ice"      : either side sends an ICE candidate
 *   - "call-hangup"   : either side ends the call
 *   - "call-reject"   : callee declines
 *   - "call-busy"     : callee already in a call
 *
 * STUN servers used for NAT traversal (Google's free public servers).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CALL_SIGNAL_KIND = 25050; // Ephemeral custom kind for call signaling

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState =
  | 'idle'
  | 'calling'       // We initiated, waiting for answer
  | 'receiving'     // Someone is calling us
  | 'connecting'    // Answer received, ICE negotiating
  | 'connected'     // Call is live
  | 'ended';

export type CallType = 'audio' | 'video';

export interface IncomingCallInfo {
  callerPubkey: string;
  callType: CallType;
  offerId: string;
  sdpOffer: RTCSessionDescriptionInit;
}

interface SignalPayload {
  type: 'call-offer' | 'call-answer' | 'call-ice' | 'call-hangup' | 'call-reject' | 'call-busy';
  callType?: CallType;
  offerId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCCall() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [remotePubkey, setRemotePubkey] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const currentOfferIdRef = useRef<string | null>(null);
  const subCleanupRef = useRef<(() => void) | null>(null);

  const relayUrls = config.relayMetadata.relays
    .filter(r => r.read && r.write)
    .map(r => r.url);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const sendSignal = useCallback(async (recipientPubkey: string, payload: SignalPayload) => {
    if (!user) return;
    try {
      const plaintext = JSON.stringify(payload);
      if (!user.signer.nip44) throw new Error('NIP-44 not supported by your signer');
      const encrypted = await user.signer.nip44.encrypt(recipientPubkey, plaintext);
      const event = await user.signer.signEvent({
        kind: CALL_SIGNAL_KIND,
        content: encrypted,
        tags: [['p', recipientPubkey]],
        created_at: Math.floor(Date.now() / 1000),
      });
      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;
      await relayGroup.event(event, { signal: AbortSignal.timeout(5000) });
    } catch (e) {
      console.error('[WebRTC] sendSignal error', e);
    }
  }, [user, nostr, relayUrls]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (subCleanupRef.current) {
      subCleanupRef.current();
      subCleanupRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemotePubkey(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setError(null);
    pendingCandidatesRef.current = [];
    currentOfferIdRef.current = null;
  }, []);

  const createPeerConnection = useCallback((peerPubkey: string) => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(peerPubkey, { type: 'call-ice', candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? null);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
      } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        setCallState('ended');
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal, cleanup]);

  const getMediaStream = useCallback(async (type: CallType): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720 } : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ── Subscription for incoming signals ────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;
    let active = true;

    const processSignal = async (event: { pubkey: string; content: string }) => {
      if (!active || !user?.signer.nip44) return;
      let payload: SignalPayload;
      try {
        const decrypted = await user.signer.nip44.decrypt(event.pubkey, event.content);
        payload = JSON.parse(decrypted);
      } catch {
        return; // Not for us or can't decrypt
      }

      if (payload.type === 'call-offer' && payload.sdp && payload.offerId && payload.callType) {
        if (callState !== 'idle') {
          // Already in a call — send busy
          sendSignal(event.pubkey, { type: 'call-busy' });
          return;
        }
        setIncomingCall({
          callerPubkey: event.pubkey,
          callType: payload.callType,
          offerId: payload.offerId,
          sdpOffer: payload.sdp,
        });
        setCallState('receiving');
        setRemotePubkey(event.pubkey);
      }

      if (payload.type === 'call-answer' && payload.sdp) {
        if (pcRef.current && pcRef.current.signalingState !== 'closed') {
          await pcRef.current.setRemoteDescription(payload.sdp);
          // Flush pending ICE candidates
          for (const c of pendingCandidatesRef.current) {
            await pcRef.current.addIceCandidate(c).catch(() => {});
          }
          pendingCandidatesRef.current = [];
          setCallState('connecting');
        }
      }

      if (payload.type === 'call-ice' && payload.candidate) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(payload.candidate).catch(() => {});
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
      }

      if (payload.type === 'call-hangup' || payload.type === 'call-reject' || payload.type === 'call-busy') {
        if (payload.type === 'call-busy') setError('User is already in a call.');
        if (payload.type === 'call-reject') setError('Call was declined.');
        setCallState('ended');
        cleanup();
      }
    };

    // Subscribe to ephemeral call signals addressed to us
    (async () => {
      try {
        const controller = new AbortController();
        subCleanupRef.current = () => controller.abort();

        for await (const event of relayGroup.req(
          [{ kinds: [CALL_SIGNAL_KIND], '#p': [user.pubkey], limit: 0 }],
          { signal: controller.signal },
        )) {
          if (!active) break;
          if ('id' in event) {
            processSignal(event as { pubkey: string; content: string });
          }
        }
      } catch {
        // Subscription ended
      }
    })();

    return () => {
      active = false;
      subCleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.pubkey]);

  // ── Public API ────────────────────────────────────────────────────────────

  /** Initiate a call to another user */
  const startCall = useCallback(async (peerPubkey: string, type: CallType) => {
    if (!user) { setError('You must be logged in to make calls.'); return; }
    if (!user.signer.nip44) { setError('Your signer does not support NIP-44 encryption required for calls.'); return; }
    if (callState !== 'idle') return;

    setError(null);
    setCallType(type);
    setRemotePubkey(peerPubkey);
    setCallState('calling');

    try {
      const stream = await getMediaStream(type);
      const pc = createPeerConnection(peerPubkey);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerId = crypto.randomUUID();
      currentOfferIdRef.current = offerId;

      await sendSignal(peerPubkey, {
        type: 'call-offer',
        callType: type,
        offerId,
        sdp: offer,
      });
    } catch (e) {
      setError(`Failed to start call: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setCallState('ended');
      cleanup();
    }
  }, [user, callState, getMediaStream, createPeerConnection, sendSignal, cleanup]);

  /** Accept an incoming call */
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user) return;
    setError(null);
    setCallType(incomingCall.callType);

    try {
      const stream = await getMediaStream(incomingCall.callType);
      const pc = createPeerConnection(incomingCall.callerPubkey);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(incomingCall.sdpOffer);

      // Flush any buffered ICE candidates
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(c).catch(() => {});
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal(incomingCall.callerPubkey, { type: 'call-answer', sdp: answer });

      setCallState('connecting');
      setIncomingCall(null);
    } catch (e) {
      setError(`Failed to accept call: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setCallState('ended');
      cleanup();
    }
  }, [incomingCall, user, getMediaStream, createPeerConnection, sendSignal, cleanup]);

  /** Decline an incoming call */
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;
    await sendSignal(incomingCall.callerPubkey, { type: 'call-reject' });
    setCallState('ended');
    cleanup();
  }, [incomingCall, sendSignal, cleanup]);

  /** Hang up the current call */
  const hangUp = useCallback(async () => {
    if (remotePubkey) {
      await sendSignal(remotePubkey, { type: 'call-hangup' });
    }
    setCallState('ended');
    cleanup();
  }, [remotePubkey, sendSignal, cleanup]);

  /** Toggle microphone mute */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !enabled; });
    setIsMuted(enabled);
  }, [isMuted]);

  /** Toggle camera on/off */
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = !isCameraOff;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !enabled; });
    setIsCameraOff(enabled);
  }, [isCameraOff]);

  /** Reset to idle (after call ended) */
  const dismissCall = useCallback(() => {
    setCallState('idle');
    setError(null);
  }, []);

  return {
    callState,
    callType,
    remotePubkey,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    error,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleCamera,
    dismissCall,
  };
}
