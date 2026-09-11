/**
 * figurebed 上传编排：把「登录 → 状态判定 → 按需引导 → 领 token → 浏览器直传」
 * 串成一个 uploadGeneratedImage() 调用。
 * 上传目标与 img.shenzjd.com 共用同一个 figurebed 仓库（<用户名>/img.shenzjd.com），
 * 图放进 ai/ 子目录做来源隔离，文件名沿用图床的 imgx- 时间戳命名。
 */

import { ensureWxLogin } from '../../utils/wxauth-client'
import { GitHubAPI } from './github'
import {
  FIGUREBED_CAPABILITY,
  FIGUREBED_REPO,
  WxAuthError,
  buildGithubAuthorizeUrl,
  buildGithubInstallUrl,
  getCapabilityToken,
  getGithubSetups,
  invalidateGithubStatus,
  openGithubGuideWindow,
  readTokenCookie,
  resolveGithubAction,
  setupCapability,
} from './wxauth'

/** 生成图在图床仓库中的存放目录（与手动上传图隔离） */
export const FIGUREBED_UPLOAD_DIR = 'ai'

/** 上传结果默认使用的 CDN 前缀（国内直连优先，可在复制时手动换 raw） */
const DEFAULT_CDN = 'jsdmirror'

export interface UploadResult {
  /** 外链（默认 jsdmirror CDN） */
  url: string
  /** Markdown 格式 */
  markdown: string
  /** 仓库内路径 */
  path: string
  /** 仓库定位信息，用于按需换 CDN 前缀 */
  target: { owner: string; repo: string; branch: string; path: string }
}

export class UploadGuideError extends Error {
  /** 用户取消了引导（未完成绑定/安装）等可安全提示重试的情况 */
  constructor(message: string) {
    super(message)
    this.name = 'UploadGuideError'
  }
}

// —— 内部工具 ——

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** 沿用图床的 imgx-YYYYMMDD-HHMMSS-rand 命名，管理页可解析上传时间 */
function buildFileName(ext: string): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const rand = Math.random().toString(36).slice(2, 6)
  const safeExt = ext.replace(/^\./, '') || 'png'
  return `imgx-${date}-${time}-${rand}.${safeExt}`
}

/** 拼外链（jsdmirror 不支持动态 WebP，保持原图链接） */
function buildCdnUrl(owner: string, repo: string, branch: string, path: string): string {
  if (DEFAULT_CDN === 'jsdmirror') {
    return `https://cdn.jsdmirror.com/gh/${owner}/${repo}@${branch}/${path}`
  }
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
}

/** 确保已微信登录，返回 wxauth-token；未登录会弹出登录窗 */
async function ensureWxToken(): Promise<string> {
  let token = readTokenCookie()
  if (token) return token
  const ok = await ensureWxLogin()
  if (!ok) throw new UploadGuideError('需要先登录（微信扫码），登录后重试上传')
  token = readTokenCookie()
  if (!token) throw new UploadGuideError('登录态获取失败，请重试')
  return token
}

/**
 * 状态判定 + 按需引导，直到 figurebed 就绪。
 * 引导（绑定/安装/开通）每一步都是新窗口完成，回来后强制重查 setups。
 */
async function ensureFigurebedReady(token: string): Promise<void> {
  // 引导闭环最多 3 轮，防死循环（正常 0~2 轮）
  for (let round = 0; round < 3; round++) {
    const setups = await getGithubSetups(token, round > 0)
    const action = resolveGithubAction(setups)

    if (action.type === 'ready') return

    if (action.type === 'bind') {
      await openGithubGuideWindow(buildGithubAuthorizeUrl(token))
    } else if (action.type === 'install') {
      await openGithubGuideWindow(buildGithubInstallUrl(token))
    } else {
      const result = await setupCapability(token, action.capability, FIGUREBED_REPO)
      if (result.status === 'active') {
        invalidateGithubStatus()
        return
      }
      // pending_grant：仓库已建，需要用户去 GitHub 勾选安装范围，完成后重调 setup
      if (result.installUrl) {
        await openGithubGuideWindow(result.installUrl)
      }
    }
  }
  throw new UploadGuideError('图床未就绪：请先在 img.shenzjd.com 完成绑定 GitHub 与安装 GitHub App')
}

/**
 * 上传一张生成图到图床仓库。
 * @returns 外链与 Markdown；失败抛错（message 可直接展示给用户）
 */
export async function uploadGeneratedImage(
  dataUrl: string,
  ext: string,
  prompt: string
): Promise<UploadResult> {
  const token = await ensureWxToken()
  await ensureFigurebedReady(token)

  // 领凭证（409 引导动作在此兜一轮：完成引导后重试一次）
  let cap: Awaited<ReturnType<typeof getCapabilityToken>>
  try {
    cap = await getCapabilityToken(token)
  } catch (err) {
    if (err instanceof WxAuthError && err.action && err.action !== 'grant') {
      invalidateGithubStatus()
      await ensureFigurebedReady(token)
      cap = await getCapabilityToken(token)
    } else {
      throw err
    }
  }

  const api = new GitHubAPI(cap.token, cap.owner, cap.repo)
  const path = `${FIGUREBED_UPLOAD_DIR}/${buildFileName(ext)}`
  const blob = dataUrlToBlob(dataUrl)
  const title = prompt.trim().split('\n')[0].slice(0, 40) || 'AI 生成图'
  await api.createOrUpdateFile(path, blob, `upload: ${path}（freeimg AI 生成图：${title}）`)

  const branch = 'main'
  const target = { owner: cap.owner, repo: cap.repo, branch, path }
  const url = buildCdnUrl(cap.owner, cap.repo, branch, path)
  return { url, markdown: `![${title}](${url})`, path, target }
}

/** 换 CDN 前缀（复制菜单用）：jsdmirror 国内快，raw 稳定不受仓库体积影响 */
export function buildUrlWithCdn(
  target: { owner: string; repo: string; branch: string; path: string },
  cdn: 'jsdmirror' | 'raw'
): string {
  const { owner, repo, branch, path } = target
  if (cdn === 'raw') {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  }
  return buildCdnUrl(owner, repo, branch, path)
}

export { FIGUREBED_CAPABILITY }
