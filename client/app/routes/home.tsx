import type { Route } from "./+types/home";
import { HeroSection, ProblemSection, SolutionSection, HowItWorks, CodeExample, FeaturesSection, CTASection } from "~/components/Landing";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Authly | Home" },
    { name: "description", content: "Multi-tenant authentication SaaS documentation and interactive API explorer." },
  ];
}

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <CodeExample />
      <FeaturesSection />
      <CTASection />
    </main>
  )
}