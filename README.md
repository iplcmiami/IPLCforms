# IPLC Forms - PDF Form Management System

A comprehensive PDF form management system built with Next.js 14 and Cloudflare Pages. Design PDF forms occasionally using pdfme, then fill, AI-summarize, and print them repeatedly.

## Features

- **PDF Form Designer**: Create and design PDF forms using pdfme library
- **Form Filling**: Fill out forms with a user-friendly interface
- **AI Summarization**: Automatically summarize form content using OpenAI API
- **Print Management**: Print filled forms with professional formatting
- **Admin Authentication**: Secure admin access with cookie-based authentication
- **Database Storage**: Store forms and data using Cloudflare D1 database

## Technology Stack

- **Framework**: Next.js 14 with App Router and TypeScript
- **PDF Library**: pdfme (@pdfme/ui, @pdfme/generator)
- **Database**: Cloudflare D1
- **Deployment**: Cloudflare Pages with Functions
- **AI Integration**: OpenAI API (gpt-4o-mini)
- **Print Functionality**: react-to-print and html2pdf.js
- **Styling**: Tailwind CSS
- **Authentication**: Cookie-based middleware

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Pages and D1 enabled
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/iplcmiami/iplcforms.git
cd iplcforms
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys and configuration
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This project is configured for deployment on Cloudflare Pages with Functions:

```bash
npm run build
wrangler pages deploy dist
```

## Database Schema

The project uses Cloudflare D1 database with the following tables:
- `forms`: Store form templates and metadata
- `submissions`: Store form submissions and data
- `users`: Manage admin users and authentication

## Contributing

This project is maintained by IPLC Miami. For issues or contributions, please contact info@iplcmiami.com.

## License

Private project - All rights reserved.
