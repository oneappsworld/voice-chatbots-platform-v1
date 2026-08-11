import { synthesizeSpeech } from "@/app/bots/actions";
import { speakText, type VoiceStyle } from "@/lib/tts";
import type { Language } from "@/lib/nlu";

/**
 * Speaks a bot's answer through the account's cloned ElevenLabs voice when
 * connected; otherwise falls back to the browser's built-in speechSynthesis
 * so bots keep working with zero setup either way.
 */
export async function playBotResponse(
  text: string,
  opts: { language: Language; style: VoiceStyle; voices: SpeechSynthesisVoice[]; cacheKey?: string },
  handlers?: { onStart?: () => void; onEnd?: () => void }
): Promise<{ engine: "elevenlabs" | "browser"; cached?: boolean }> {
  const result = await synthesizeSpeech(text, { cacheKey: opts.cacheKey });

  if (result.ok) {
    const audio = new Audio(result.audioDataUri);
    audio.onplay = () => handlers?.onStart?.();
    audio.onended = () => handlers?.onEnd?.();
    audio.onerror = () => handlers?.onEnd?.();
    try {
      await audio.play();
      return { engine: "elevenlabs", cached: result.cached };
    } catch {
      // Autoplay or decode failure — fall through to browser TTS below.
    }
  }

  speakText(
    text,
    { language: opts.language, style: opts.style, voices: opts.voices },
    { onStart: handlers?.onStart, onEnd: handlers?.onEnd, onError: handlers?.onEnd }
  );
  return { engine: "browser" };
}
