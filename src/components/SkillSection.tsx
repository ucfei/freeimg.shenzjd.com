'use client'

import { useState } from 'react'
import './SkillSection.css'

const INSTALL_CMD = 'npx skills add wu529778790/shenzjd-skills -s freeimg -y'
const REPO_URL = 'https://github.com/wu529778790/shenzjd-skills/tree/main/freeimg'

const FEATURES = [
  { icon: '💬', title: '对话直接出图', desc: '在 Claude Code、Cursor 等 AI 编程工具里说一句"帮我画个封面"，AI 调用 Skill 直接把图片存到本地。' },
  { icon: '🔑', title: '共用同一个令牌', desc: '和网页版一样使用 Gitee AI 免费令牌，每天约 100 张 2K 额度，无需任何付费 API Key。' },
  { icon: '📦', title: '一条命令安装', desc: '基于 skills.sh 标准，一行命令装进你的 AI 工具，令牌写入本地配置，不进仓库不上传。' }
]

export default function SkillSection() {
  const [copied, setCopied] = useState(false)

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 剪贴板不可用时忽略，用户仍可手动选中复制
    }
  }

  return (
    <section className="skill" id="skill">
      <div className="container">
        <div className="section-header">
          <h2>更习惯用 AI？装个 Skill</h2>
          <p>不想在网页上操作，也可以让 AI 编程工具在对话里直接帮你生图</p>
        </div>

        <div className="skill-features">
          {FEATURES.map((f) => (
            <div className="skill-feature" key={f.title}>
              <div className="skill-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="skill-install">
          <code>{INSTALL_CMD}</code>
          <button className="skill-copy" onClick={copyCmd}>
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>

        <p className="skill-more">
          安装后即可对 AI 说「用 freeimg 生成一张……」；
          了解更多用法见{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub 仓库 ↗
          </a>
        </p>
      </div>
    </section>
  )
}
