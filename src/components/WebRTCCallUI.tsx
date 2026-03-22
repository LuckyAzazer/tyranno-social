/**
 * WebRTCCallUI
 *
 * Full-screen overlay shown during an active (or connecting) call.
 * Displays remote + local video feeds and audio/video/hang-up controls.
 */

import { useEffect, useRef } from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2,
} from 'lucide-react';
import type { CallState, CallType } from '@/hooks/useWebRTCCall';
import { cn } from '@/lib/utils';

interface WebRTCCallUIProps {
  callState: CallState;
  callType: CallType;
  remotePubkey: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}

function VideoBox({
  stream,
  muted = false,
  className,
  label,
  fallbackPubkey,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  label?: string;
  fallbackPubkey?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const author = useAuthor(fallbackPubkey ?? '');
  const meta = author.data?.metadata;
  const name = meta?.name || genUserName(fallbackPubkey ?? '');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div className={cn('relative overflow-hidden bg-gray-900 rounded-2xl flex items-center justify-center', className)}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        /* No video — show avatar */
        <div className="flex flex-col items-center gap-3">
          {fallbackPubkey ? (
            <Avatar className="h-24 w-24 ring-4 ring-white/10">
              <AvatarImage src={meta?.picture} alt={name} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                {name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center">
              <VideoOff className="h-10 w-10 text-white/40" />
            </div>
          )}
          {fallbackPubkey && (
            <span className="text-white/70 text-sm font-medium">{name}</span>
          )}
        </div>
      )}
      {label && (
        <span className="absolute bottom-2 left-3 text-white/70 text-xs font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}

export function WebRTCCallUI({
  callState,
  callType,
  remotePubkey,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onHangUp,
}: WebRTCCallUIProps) {
  const author = useAuthor(remotePubkey);
  const meta = author.data?.metadata;
  const remoteName = meta?.display_name || meta?.name || genUserName(remotePubkey);

  const isConnecting = callState === 'calling' || callState === 'connecting';

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
      {/* Remote + local video area */}
      <div className="relative w-full flex-1 flex items-center justify-center p-4">

        {/* Remote video (large, centered) */}
        <VideoBox
          stream={remoteStream}
          className="w-full max-w-3xl aspect-video"
          label={remoteName}
          fallbackPubkey={remotePubkey}
        />

        {/* Local video (picture-in-picture, bottom-right) */}
        {callType === 'video' && (
          <div className="absolute bottom-6 right-6 w-36 sm:w-44 shadow-2xl ring-2 ring-white/10 rounded-xl overflow-hidden">
            <VideoBox
              stream={localStream}
              muted
              className="aspect-video"
              label="You"
            />
          </div>
        )}

        {/* Connecting overlay */}
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-4">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
            <p className="text-white/80 text-lg font-medium">
              {callState === 'calling' ? `Calling ${remoteName}…` : 'Connecting…'}
            </p>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="w-full flex items-center justify-center gap-4 py-6 px-8">
        {/* Mute */}
        <Button
          size="icon"
          onClick={onToggleMute}
          className={cn(
            'h-14 w-14 rounded-full text-white transition-all',
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white/15 hover:bg-white/25',
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {/* Camera (video calls only) */}
        {callType === 'video' && (
          <Button
            size="icon"
            onClick={onToggleCamera}
            className={cn(
              'h-14 w-14 rounded-full text-white transition-all',
              isCameraOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/15 hover:bg-white/25',
            )}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        {/* Hang up */}
        <Button
          size="icon"
          onClick={onHangUp}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50 transition-all hover:scale-105 active:scale-95"
          title="End call"
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
