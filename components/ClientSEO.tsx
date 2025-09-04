'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface ClientSEOProps {
  structuredData?: any
}

export default function ClientSEO({ structuredData }: ClientSEOProps) {
  useEffect(() => {
    // Core Web Vitals監視
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // カスタム分析に送信（実装に応じて調整）
          if (process.env.NODE_ENV === 'production') {
            console.log('Performance metric:', {
              name: entry.name,
              value: entry.startTime,
              type: entry.entryType
            })
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] })
      } catch (e) {
        // ブラウザサポートがない場合は無視
      }

      return () => observer.disconnect()
    }
  }, [])

  return (
    <>
      {/* 構造化データの動的挿入 */}
      {structuredData && (
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      
      {/* パフォーマンス最適化: リソースヒント */}
      <Script
        id="resource-hints"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // プリロード最適化
            if ('IntersectionObserver' in window) {
              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting && entry.target.dataset.src) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                  }
                });
              });
              
              document.querySelectorAll('img[data-src]').forEach(img => {
                observer.observe(img);
              });
            }
          `
        }}
      />
    </>
  )
}