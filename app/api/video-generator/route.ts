import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are Classia AI, an educational video generator assistant. Help users create engaging educational content by analyzing their prompts and providing step-by-step guidance for creating educational videos. Be encouraging and educational in your responses.',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
