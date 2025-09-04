import { GET } from '../../app/api/v1/presets/route'
import { NextRequest } from 'next/server'

describe('/api/v1/presets', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('GET', () => {
    it('未認証ユーザーは基本プリセットのみ取得可能', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      }

      jest.doMock('../../app/api/_lib/auth', () => ({
        getSupabaseWithRLS: jest.fn().mockReturnValue(mockSupabase)
      }))

      const request = new NextRequest('http://localhost:3000/api/v1/presets')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.presets).toBeDefined()
      expect(data.presets.length).toBe(3) // Liteプランは3つのプリセット
      expect(data.currentPlan).toBe('lite')
    })

    it('Standardプランユーザーは7つのプリセット取得可能', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null
          })
        },
        rpc: jest.fn().mockResolvedValue({
          data: { plan_code: 'standard' },
          error: null
        })
      }

      jest.doMock('../../app/api/_lib/auth', () => ({
        getSupabaseWithRLS: jest.fn().mockReturnValue(mockSupabase)
      }))

      const request = new NextRequest('http://localhost:3000/api/v1/presets')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.presets.length).toBe(7) // Standardプランは7つのプリセット
      expect(data.currentPlan).toBe('standard')
    })

    it('Creatorプランユーザーは全プリセット取得可能', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null
          })
        },
        rpc: jest.fn().mockResolvedValue({
          data: { plan_code: 'creator' },
          error: null
        })
      }

      jest.doMock('../../app/api/_lib/auth', () => ({
        getSupabaseWithRLS: jest.fn().mockReturnValue(mockSupabase)
      }))

      const request = new NextRequest('http://localhost:3000/api/v1/presets')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.presets.length).toBe(12) // Creatorプランは全プリセット
      expect(data.currentPlan).toBe('creator')
    })
  })
})