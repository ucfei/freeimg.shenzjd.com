import { NextRequest, NextResponse } from 'next/server'
import { getPrompts } from '@/lib/prompts'
import { clientIp, logApiDone, logApiError, logApiStart } from '@/lib/api-log'

/**
 * GET /api/prompts?page=1&pageSize=24&dimension=useCases&category=8&search=xx
 * 提示词列表查询接口(分页 + 筛选 + 搜索),供外部工程调用
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const startedAt = Date.now()
  const ip = clientIp(request)
  const query = {
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '24',
    dimension: searchParams.get('dimension') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || ''
  }
  logApiStart('prompts', { ip, ...query })

  try {
    const data = await getPrompts({
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : 24,
      dimension: searchParams.get('dimension') || undefined,
      categoryId: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined
    })

    logApiDone('prompts', 200, startedAt, { ip, total: data.total })
    return NextResponse.json({
      success: true,
      data,
      code: 0
    })
  } catch (err) {
    logApiError('prompts', err, { ip, elapsed: Date.now() - startedAt })
    logApiDone('prompts', 500, startedAt, { ip, reason: '查询失败' })
    return NextResponse.json(
      {
        success: false,
        code: 500,
        message: err instanceof Error ? err.message : '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
