import type { Metadata } from 'next'
import SectionNav from '@/src/components/SectionNav'
import HunyuanHero from '@/src/components/HunyuanHero'
import HunyuanSection from '@/src/components/HunyuanSection'
import HunyuanHelp from '@/src/components/HunyuanHelp'
import SkillSection from '@/src/components/SkillSection'
import './hunyuan.css'

export const metadata: Metadata = {
  title: '混元生图 - FreeImg',
  description:
    '基于腾讯混元 3.0 的免费 AI 图片生成：配置你自己的腾讯云密钥，即可使用微信「小程序成长计划」的 10 亿 Token + 10 万张图免费额度，支持文生图、图生图与 AI 提示词润色。',
  keywords: ['混元生图', '腾讯混元', '小程序成长计划', 'AI 图片生成', '图生图', '免费生图', '提示词润色']
}

// 与首页同构:左侧锚点导航 + 宣传话术 → 真实生图工作台(自带密钥配置)+ 历史记录 → 使用教程 → AI Skill
export default function HunyuanPage() {
  return (
    <div className="hunyuan-page">
      <SectionNav
        sections={[
          { id: 'generator', label: '在线生成' },
          { id: 'history', label: '生成历史' },
          { id: 'tutorial', label: '使用教程' },
          { id: 'skill', label: 'AI Skill' }
        ]}
      />
      <HunyuanHero />
      <HunyuanSection />
      <HunyuanHelp />
      <SkillSection
        title="更习惯用 AI？装个 Skill"
        subtitle="不想在网页上配置，也可以让 AI 编程工具在对话里直接帮你调混元生图"
        installCmd="npx skills add wu529778790/shenzjd-skills -s hunyuan-image -y"
        repoUrl="https://github.com/wu529778790/shenzjd-skills/tree/main/hunyuan-image"
        features={[
          {
            icon: '🆓',
            title: '免费领 10 万张',
            desc: '微信「小程序成长计划」激励资源包免费领取：10 万张 AI 生图 + 10 亿 Token，6 个月有效，额度烧在你自己的环境上，全程不花钱。'
          },
          {
            icon: '🖼️',
            title: '文生图 + 垫图',
            desc: '混元 3.0 支持参考图改图，在 AI 编程工具里说一句话就能出图、改图，凭据配置一次长期使用。'
          },
          {
            icon: '📦',
            title: '一条命令安装',
            desc: '基于 skills.sh 标准，一行命令装进你的 AI 工具；密钥只写本地配置，不进仓库不上传。'
          }
        ]}
        moreText={
          <>
            安装后即可对 AI 说「用混元生成一张……」；领取资源包的图文教程见本页上方「使用教程」，
            用法详情见{' '}
            <a href="https://github.com/wu529778790/shenzjd-skills/tree/main/hunyuan-image" target="_blank" rel="noopener noreferrer">
              GitHub 仓库 ↗
            </a>
          </>
        }
      />
    </div>
  )
}
