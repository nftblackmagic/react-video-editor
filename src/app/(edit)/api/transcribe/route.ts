import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(request: NextRequest) {
  try {
    const { url, language, userId } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Fetch the audio/video file from URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media file: ${response.statusText}`);
    }

    // Create a Blob from the response
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const audioBlob = new Blob([await response.arrayBuffer()], {
      type: contentType,
    });

    // Call ElevenLabs transcription API
    const transcription = await elevenlabs.speechToText.convert({
      file: audioBlob,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: language || undefined,
      diarize: true,
    });

    // Process the transcription response
    const segments = [];

    if ("words" in transcription && transcription.words) {
      const words = transcription.words as any[];
      for (let index = 0; index < words.length; index++) {
        const word = words[index];
        segments.push({
          id: `seg-${index + 1}`, // TODO: add id for future db storage
          text: word.text || "",
          start: word.start || 0, // Keep in seconds for API response
          end: word.end || 0, // Keep in seconds for API response
          type: word.type || "word",
          speaker_id: word.speaker_id || null,
          logprob: word.logprob || 0,
          characters: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      segments,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
