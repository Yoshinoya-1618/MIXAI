'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logError } from '@/lib/error-handler'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントで発生したエラーをキャッチして表示
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    
    // エラーログをサーバーに送信
    logError(error, {
      componentStack: errorInfo.componentStack,
      digest: errorInfo.digest
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} reset={this.reset} />
      }
      
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />
    }

    return this.props.children
  }
}

/**
 * デフォルトのエラー表示コンポーネント
 */
function DefaultErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error | null; 
  reset: () => void 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            エラーが発生しました
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          {error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                詳細情報
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {error.message}
                {error.stack && '\n' + error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="mt-8 space-y-3">
          <button
            onClick={reset}
            className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4" />
            もう一度試す
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Home className="h-4 w-4" />
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ページ単位のエラーバウンダリ
 */
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">
                  ページの読み込みに失敗しました
                </h3>
                <p className="mt-2 text-sm text-red-700">
                  {error.message || '予期しないエラーが発生しました'}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    再読み込み
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 text-sm"
                  >
                    前のページに戻る
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * コンポーネント単位のエラーバウンダリ
 */
export function ComponentErrorBoundary({ 
  children,
  name = 'コンポーネント'
}: { 
  children: React.ReactNode;
  name?: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {name}の読み込みに失敗しました
            </span>
            <button
              onClick={reset}
              className="ml-auto text-xs text-yellow-600 hover:text-yellow-700 underline"
            >
              再試行
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}