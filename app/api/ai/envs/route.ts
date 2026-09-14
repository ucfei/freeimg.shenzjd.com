import { NextRequest, NextResponse } from 'next/server'
import CloudBase from '@cloudbase/manager-node'
import { clientIp, logApiDone, logApiError, logApiStart } from '@/lib/api-log'

/**
 * POST /api/ai/envs  自带密钥(BYOK):凭 SecretId + SecretKey 列出可访问的云开发环境
 * body: { secretId: string, secretKey: string }
 * 返回: { success, envs: [{ envId, alias, source, status, region }] }
 *
 * 只做「列环境」这一件事:不查额度、不消耗任何调用,凭据仅本次使用、不落库不打日志。
 * 失败统一 401,避免把上游密钥相关细节透给前端。
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let body: { secretId?: string; secretKey?: string }
  try {
    body = await request.json()
  } catch {
    logApiDone('envs', 400, startedAt, { ip: clientIp(request), reason: '请求体不是合法 JSON' })
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  // 凭据不落库不打日志(见上方注释),只记录「有没有带」用于排查
  const ip = clientIp(request)
  logApiStart('envs', {
    ip,
    hasSecretId: Boolean((body.secretId || '').trim()),
    hasSecretKey: Boolean((body.secretKey || '').trim())
  })

  const secretId = (body.secretId || '').trim()
  const secretKey = (body.secretKey || '').trim()
  if (!secretId || !secretKey) {
    logApiDone('envs', 400, startedAt, { ip, reason: '缺少 SecretId / SecretKey' })
    return NextResponse.json({ success: false, message: '请填写 SecretId 与 SecretKey' }, { status: 400 })
  }

  try {
    const manager = new CloudBase({ secretId, secretKey })
    const { EnvList = [] } = await manager.env.listEnvs()
    const envs = EnvList.map((env: { EnvId?: string; Alias?: string; Source?: string; Status?: string; Region?: string }) => ({
      envId: env.EnvId || '',
      alias: env.Alias || '',
      source: env.Source || '',
      status: env.Status || '',
      region: env.Region || ''
    }))
    logApiDone('envs', 200, startedAt, { ip, envCount: envs.length })
    return NextResponse.json({ success: true, envs })
  } catch (err) {
    logApiError('envs', err, { ip, elapsed: Date.now() - startedAt })
    logApiDone('envs', 401, startedAt, { ip, reason: '凭据校验失败' })
    // 密钥错 / 无权限 / 网络异常统一按凭据无效处理,不给上游细节
    return NextResponse.json(
      { success: false, message: 'SecretId / SecretKey 无效或无权访问云开发，请检查后重试' },
      { status: 401 }
    )
  }
}
