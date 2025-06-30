import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configure Edge Runtime for Cloudflare Pages
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client at runtime when environment variables are available
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const { formData, formTitle } = await request.json();

    if (!formData || !formTitle) {
      return NextResponse.json(
        { error: 'Form data and title are required' },
        { status: 400 }
      );
    }

    // Convert form data to a readable format for the AI
    const formDataText = Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const prompt = `Please provide a concise professional summary of the following form submission for "${formTitle}":

${formDataText}

Please format the summary as a brief paragraph that highlights the key information and purpose of this form submission. Keep it professional and suitable for administrative review.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional administrative assistant helping to summarize form submissions for review. Provide clear, concise summaries that highlight key information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarization error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API configuration error' },
          { status: 500 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}