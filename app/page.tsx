import Hero from '@/src/components/Hero'
import GeneratorSection from '@/src/components/GeneratorSection'
import Tutorial from '@/src/components/Tutorial'
import SkillSection from '@/src/components/SkillSection'
import SectionNav from '@/src/components/SectionNav'

// 工具优先:Hero 紧凑带过,实际生图紧随其后,教程与 AI Skill 两种用法收尾
export default function HomePage() {
  return (
    <>
      <SectionNav />
      <Hero />
      <GeneratorSection />
      <Tutorial />
      <SkillSection />
    </>
  )
}
