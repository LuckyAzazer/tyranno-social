/**
 * IncomingCallModal
 *
 * Shown when another user is calling. Displays caller info and
 * Accept / Decline buttons. Rings an audio tone while waiting.
 */

import { useEffect, useRef } from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import type { IncomingCallInfo } from '@/hooks/useWebRTCCall';

interface IncomingCallModalProps {
  call: IncomingCallInfo;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
  const author = useAuthor(call.callerPubkey);
  const meta = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(call.callerPubkey);

  // Play a simple ring tone using the Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const playRing = () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const beep = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, ctx.currentTime + start);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur + 0.05);
        };

        // Two-tone ring pattern
        beep(480, 0, 0.4);
        beep(620, 0.05, 0.4);
        beep(480, 0.5, 0.4);
        beep(620, 0.55, 0.4);
      } catch {
        // AudioContext not available
      }
    };

    playRing();
    ringIntervalRef.current = window.setInterval(playRing, 3000);

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 border border-white/10 text-center space-y-6">
        {/* Animated ring pulse */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/30 animate-ping" />
          <span className="absolute inline-flex h-24 w-24 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
          <Avatar className="relative h-24 w-24 ring-4 ring-primary/50 shadow-xl">
            <AvatarImage src={meta?.picture} alt={name} />
            <AvatarFallback className="bg-primary/20 text-primary text-3xl">
              {name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller info */}
        <div className="space-y-1">
          <p className="text-white/60 text-sm">Incoming {call.callType} call</p>
          <h2 className="text-white text-2xl font-bold">{name}</h2>
          {meta?.nip05 && (
            <p className="text-white/50 text-xs">{meta.nip05}</p>
          )}
        </div>

        {/* Accept / Decline */}
        <div className="flex items-center justify-center gap-8 pt-2">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="icon"
              onClick={onReject}
              className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40 transition-transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="icon"
              onClick={onAccept}
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-900/40 transition-transform hover:scale-105 active:scale-95"
            >
              {call.callType === 'video'
                ? <Video className="h-7 w-7" />
                : <Phone className="h-7 w-7" />
              }
            </Button>
            <span className="text-white/50 text-xs">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
