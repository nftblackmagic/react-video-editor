"use server";

import { TranscriptSegment } from "@/features/editor/transcript/types";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function transcribeElevenLabs(
  url: string,
  language: string
): Promise<TranscriptSegment[]> {
  const response = await fetch(url);
  const audioBlob = await response.blob();
  // Call ElevenLabs transcription API
  const transcription = await elevenlabs.speechToText.convert({
    file: audioBlob,
    modelId: "scribe_v1",
    tagAudioEvents: true,
    languageCode: language,
    diarize: true,
  });

  if ("words" in transcription && transcription.words) {
    const words = transcription.words as any[];
    const segments: TranscriptSegment[] = words.map(
      (seg: any, index: number) => ({
        id: seg.id || `seg-${index + 1}`,
        text: seg.text || "",
        start: seg.start * 1000, // Convert seconds to milliseconds
        end: seg.end * 1000, // Convert seconds to milliseconds
        type: seg.type,
        speaker_id: seg.speaker_id,
        logprob: seg.logprob,
        characters: seg.characters,
      })
    );
    return segments;
  }
  throw new Error("Transcription failed");
}
