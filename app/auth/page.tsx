import { NextResponse } from 'next/navigation';

export function GET(request: Request) {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  return NextResponse.redirect(url);
}
