import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Get OpenAI API key from Cloudflare Workers bindings
    const env = getEnv();
    const apiKey = env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

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

    // Direct fetch call to OpenAI API (edge runtime compatible)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'OpenAI API configuration error' },
          { status: 500 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded' },
          { status: 503 }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const completion = await response.json();
    const summary = completion.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarization error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'OpenAI API configuration error' },
          { status: 500 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('429')) {
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