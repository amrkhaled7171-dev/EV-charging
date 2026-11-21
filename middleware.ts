import { NextResponse, type NextRequest } from 'next/server';

// Section 5.2: every POST to /api/* needs a matching X-API-Key header.
export function middleware(request: NextRequest) {
  if (request.method !== 'POST') return NextResponse.next();

  const expected = process.env.API_KEY;
  const provided = request.headers.get('x-api-key');
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
