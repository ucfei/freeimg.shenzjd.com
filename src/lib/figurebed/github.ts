/**
 * GitHub Contents API 浏览器直传（从 img.shenzjd.com 的 github.ts 精简，
 * 只保留上传需要的能力：请求封装 + 创建/更新文件）。
 * token 为 wx-auth 下发的短命 installation token，只在本模块内流转。
 */

interface GitHubAPIError extends Error {
  response?: {
    status: number
    data: unknown
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof Error && 'response' in error) {
    const response = (error as GitHubAPIError).response
    return response?.status
  }
  return undefined
}

interface GitHubContentResponse {
  sha: string
  html_url: string
  size: number
}

interface GitHubFileCreateUpdateResponse {
  content: GitHubContentResponse
}

export class GitHubAPI {
  public owner: string
  public repo: string
  private branch: string
  private token: string
  // API 请求超时（毫秒）
  static readonly REQUEST_TIMEOUT = 30_000

  constructor(token: string, owner: string, repo: string, branch: string = 'main') {
    this.owner = owner
    this.repo = repo
    this.branch = branch
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `https://api.github.com${endpoint}`
    const headers: HeadersInit = {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GitHubAPI.REQUEST_TIMEOUT)

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const error: GitHubAPIError = new Error(`GitHub API error: ${response.statusText}`)
        error.response = {
          status: response.status,
          data: await response.json().catch(() => null),
        }
        throw error
      }
      return response.json()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`GitHub API 请求超时 (${GitHubAPI.REQUEST_TIMEOUT}ms)`)
      }
      throw err
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /** 创建或更新文件（422 = 文件已存在，取 sha 后覆盖更新） */
  async createOrUpdateFile(
    filePath: string,
    content: Blob,
    message: string,
    branch: string = this.branch
  ): Promise<{ sha: string; html_url: string }> {
    const contentBase64 = await this.blobToBase64(content)

    let response: GitHubFileCreateUpdateResponse
    try {
      response = await this.request<GitHubFileCreateUpdateResponse>(
        `/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(filePath)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ message, content: contentBase64, branch }),
        }
      )
    } catch (error) {
      if (getErrorStatus(error) !== 422) throw error
      const existing = await this.request<GitHubContentResponse>(
        `/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`
      )
      response = await this.request<GitHubFileCreateUpdateResponse>(
        `/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(filePath)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ message, content: contentBase64, sha: existing.sha, branch }),
        }
      )
    }

    return {
      sha: response.content.sha,
      html_url: response.content.html_url,
    }
  }
}
