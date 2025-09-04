import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mixai.app'
  
  const robots = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Specific crawl directives for SEO optimization
Allow: /help
Allow: /help/guide
Allow: /help/faq
Allow: /help/limits
Allow: /policy/*
Allow: /legal/*
Allow: /contact
Allow: /about
Allow: /status
Allow: /changelog

# Block admin and private areas
Disallow: /api/
Disallow: /admin/
Disallow: /temp/
Disallow: /_next/
Disallow: /.well-known/

# Allow search engines to access static assets
Allow: /favicon.ico
Allow: /manifest.json
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.svg
Allow: /*.webp

# Crawl delay to prevent overwhelming the server
Crawl-delay: 1`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}