import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target,
  Eye,
  Lightbulb,
  Compass,
  Workflow,
  Users,
  Handshake,
  Heart,
  Scale,
  Zap,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Puzzle,
  Search,
  Building2,
  TrendingUp,
  CheckCircle2,
  FolderKanban,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AboutPage = () => {
  return (
    <div className="flex-1 bg-white">
      {/*
          SECTION 1: About Hero (Immersive Full Background Image Treatment)
    */}
      <section className="relative overflow-hidden text-white py-20 sm:py-24 md:py-28 lg:py-32 min-h-[520px] flex items-center">
        {/* Full-bleed background image with responsive focal point */}
        <div className="absolute inset-0 z-0">
          <img
            src="/aboutpagebg.jpg"
            alt="Bridge for Impact Hub community collaboration"
            className="w-full h-full object-cover object-center md:object-[center_35%]"
          />
          {/* Base darkening layer for baseline image contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#0B1523]/40"
          />
          {/* Directional navy gradient overlay: deep solid on left, translucent on right */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#0B1523]/95 via-[#162C47]/90 to-[#162C47]/45"
          />
          {/* Subtle gold atmospheric radial glow */}
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(212,160,23,0.15),transparent_70%)] pointer-events-none"
          />
          {/* Refined top hairline accent */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />
        </div>

        <div className="container relative z-10 max-w-6xl">
          <div className="max-w-2xl lg:max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#D4A017] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" />
                About Bridge for Impact Hub
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.15]">
                Bridging the Gap Between <span className="text-[#D4A017]">Goodwill</span> and{" "}
                <span className="text-[#D4A017]">Action</span>
              </h1>

              <div className="space-y-4 text-white/90 text-base sm:text-lg leading-relaxed font-sans max-w-2xl">
                <p>
                  Across communities, passionate people, organizations, and initiatives are working to
                  create meaningful change. Yet many struggle to turn good intentions into lasting impact
                  because they lack the structure, support, resources, and partnerships needed to succeed.
                </p>
                <p className="text-white font-semibold">
                  Bridge for Impact Hub exists to help close that gap.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3.5 sm:gap-4">
                <Button
                  asChild
                  className="bg-[#D4A017] hover:bg-[#c29214] text-white font-semibold h-11 px-6 shadow-md hover:shadow-lg transition-all rounded-md"
                >
                  <Link to="/projects">Explore Projects</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xs h-11 px-6 font-medium rounded-md"
                >
                  <Link to="/register/volunteer">Join as a Volunteer</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/*
          SECTION 2: Who We Are
      */}
      <section className="py-16 md:py-20 bg-slate-50/70 border-b border-slate-200/70">
        <div className="container max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest">
                  Organizational Identity
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold mt-2">
                  Who We Are
                </h2>
              </div>

              <p className="text-slate-700 leading-relaxed text-base sm:text-lg">
                Bridge for Impact Hub (BIH) is a social impact startup committed to strengthening
                the effectiveness, sustainability, and reach of NGOs, social enterprises,
                community initiatives, and humanitarian actors.
              </p>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                We support projects from conception through implementation by helping organizations
                structure their ideas, coordinate execution, mobilize volunteers, and facilitate
                strategic partnerships. Whether an initiative is addressing education, clean water,
                healthcare access, or youth livelihood, we provide the backbone support required to
                turn compassion into measurable community outcomes.
              </p>

              <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#1E3A5F]/15 shadow-xs flex items-start gap-4">
               
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">
                    Active Facilitation, Not Just a Directory
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                    BIH is not simply a directory or listing platform. We actively facilitate,
                    incubate, and strengthen initiatives through structured hands-on guidance and
                    targeted ecosystem connections.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
                <h3 className="text-lg font-serif font-bold text-[#1E3A5F] border-b border-slate-100 pb-3">
                  At a Glance
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-slate-800">Focus</p>
                      <p className="text-xs text-slate-600">Humanitarian & Social Development Initiatives</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-slate-800">Model</p>
                      <p className="text-xs text-slate-600">End-to-end project structuring, volunteer matching, and partnership facilitation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-slate-800">Geography</p>
                      <p className="text-xs text-slate-600">Headquartered in Accra, Ghana, serving grassroots and regional change-makers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-slate-800">Orientation</p>
                      <p className="text-xs text-slate-600">Collaborative, context-relevant, and transparent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
          SECTION 3: The Challenge We Address
      */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest">
              The Reality on the Ground
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold">
              Good Ideas Need More Than Good Intentions.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Every year, promising humanitarian and grassroots projects stall or fail to reach their
              potential due to systematic structural barriers. We address the core bottlenecks that
              stand between passion and measurable impact.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: "Limited Technical & Organizational Capacity",
                description:
                  "Grassroots teams often lack the dedicated capacity or specialized frameworks to design, document, and administer complex project workflows.",
              },
              {
                icon: Puzzle,
                title: "Fragmented Execution Processes",
                description:
                  "Without structured milestone tracking and coordinated task management, even the most promising initiatives face operational delays and resource leakage.",
              },
              {
                icon: Search,
                title: "Difficulty Accessing Skilled Volunteers",
                description:
                  "Initiatives struggle to find committed volunteers with matching skill sets (medical, technical, logistics) right when projects need them most.",
              },
              {
                icon: Building2,
                title: "Limited Strategic Collaborators & Partnerships",
                description:
                  "Smaller NGOs and community builders operate in isolation, lacking direct access to institutional allies, sponsors, and complementary stakeholders.",
              },
              {
                icon: TrendingUp,
                title: "Challenges Sustaining & Scaling Initiatives",
                description:
                  "Without robust accountability frameworks and documented outcomes, pilot successes struggle to secure long-term continuity or scale beyond a single community.",
              },
              {
                icon: ShieldCheck,
                title: "Transparency & Trust Barriers",
                description:
                  "Donors and supporters require verified progress and clear accountability to invest their resources with confidence.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#1E3A5F]/20 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F] group-hover:bg-[#1E3A5F] group-hover:text-white transition-colors duration-200">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#1E3A5F] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
          SECTION 4: What We Do (Four Service Pillars)
      */}
      <section className="py-16 md:py-20 bg-slate-50/60 border-y border-slate-200/70">
        <div className="container max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold">
              What We Do
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              BIH provides hands-on structural support across four primary service pillars, enabling
              social initiatives to operate with clarity, efficiency, and compounding impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              {
                number: "01",
                icon: Compass,
                title: "Project Ideation & Design",
                description:
                  "Helping organizations turn ideas into well-structured projects through planning, design, and development of actionable project frameworks.",
                details:
                  "From defining problem scope and setting measurable indicators to structuring budgets and delivery timelines, we build the initial blueprint for execution.",
              },
              {
                number: "02",
                icon: Workflow,
                title: "Execution Guidance",
                description:
                  "Supporting organizations through implementation with structured guidance, coordination, and practical execution support.",
                details:
                  "We remain actively engaged during delivery, helping partners manage milestones, navigate unexpected hurdles, and keep project teams aligned.",
              },
              {
                number: "03",
                icon: Users,
                title: "Volunteer Sourcing & Management",
                description:
                  "Helping initiatives identify, mobilize, coordinate, and manage volunteers whose skills and interests align with project needs.",
                details:
                  "We verify volunteer interests, track hours, and coordinate community builders so project leads have dependable manpower on the ground.",
              },
              {
                number: "04",
                icon: Handshake,
                title: "Strategic Partnership Facilitation",
                description:
                  "Connecting organizations with potential collaborators, institutions, partners, and relevant stakeholders to strengthen initiatives and amplify their impact.",
                details:
                  "We bridge civil society, institutional sponsors, and community leadership to multiply available resources and avoid redundant efforts.",
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden group flex flex-col justify-between"
              >
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1E3A5F] to-[#D4A017]"
                />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F] group-hover:bg-[#1E3A5F] group-hover:text-white transition-colors duration-200">
                      <pillar.icon className="w-6 h-6 text-[#D4A017]" />
                    </div>
                    <span className="text-2xl font-serif font-bold text-slate-300 group-hover:text-[#D4A017] transition-colors">
                      {pillar.number}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1E3A5F]">
                    {pillar.title}
                  </h3>

                  <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                    {pillar.description}
                  </p>

                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {pillar.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
          SECTION 5: Mission & Vision
      */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Mission Card */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#162C47] text-white rounded-2xl p-8 sm:p-10 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div
                aria-hidden="true"
                className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"
              />
              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#D4A017]">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-[#D4A017] text-xs uppercase tracking-widest font-semibold block">
                  Our Mission
                </span>
                <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold leading-snug text-white">
                  &ldquo;To create meaningful connections between those who want to help and those who
                  need it most.&rdquo;
                </blockquote>
              </div>
              <p className="text-white/70 text-xs sm:text-sm mt-6 border-t border-white/10 pt-4 leading-relaxed relative z-10">
                Guiding every platform feature, volunteer mobilization campaign, and partner engagement.
              </p>
            </div>

            {/* Vision Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 border-2 border-[#D4A017]/30 rounded-2xl p-8 sm:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4A017]/10 rounded-full blur-xl pointer-events-none"
              />
              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#D4A017]/20 border border-[#D4A017]/30 flex items-center justify-center text-[#1E3A5F]">
                  <Eye className="w-6 h-6 text-[#1E3A5F]" />
                </div>
                <span className="text-[#D4A017] text-xs uppercase tracking-widest font-bold block">
                  Our Vision
                </span>
                <blockquote className="font-serif text-xl sm:text-2xl lg:text-2xl font-bold leading-snug text-[#1E3A5F]">
                  &ldquo;To become Ghana&apos;s leading partnership facilitation hub for humanitarian and
                  social development actors, promoting collaboration, transparency, and sustainable impact
                  across the country.&rdquo;
                </blockquote>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm mt-6 border-t border-slate-200 pt-4 leading-relaxed relative z-10">
                Building an enduring ecosystem where community solutions scale with dignity and measurable outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 
          SECTION 6: Our Values
      */}
      <section className="py-16 md:py-20 bg-slate-50/70 border-b border-slate-200/70">
        <div className="container max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest">
              Ethos & Principles
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold">
              Our Values
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              These five core values anchor our platform decisions, partner relationships, and
              community engagements.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: "Transparency",
                text: "Promoting openness, accountability, and clarity in how initiatives and partnerships are facilitated.",
              },
              {
                icon: Scale,
                title: "Integrity",
                text: "Acting responsibly, honestly, and consistently in our commitments to communities and partners.",
              },
              {
                icon: Handshake,
                title: "Collaboration",
                text: "Bringing organizations, volunteers, communities, and partners together to achieve more collectively.",
              },
              {
                icon: Heart,
                title: "Service",
                text: "Putting community needs and meaningful impact at the center of our work at every step.",
              },
              {
                icon: Zap,
                title: "Innovation",
                text: "Exploring practical, technology-driven, and creative approaches to strengthening initiatives.",
              },
            ].map((val) => (
              <div
                key={val.title}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
                    <val.icon className="w-5 h-5 text-[#D4A017]" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#1E3A5F]">{val.title}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{val.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
          SECTION 7: Our Approach
      */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[#D4A017] font-semibold text-xs uppercase tracking-widest">
              Operating Methodology
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold">
              Our Approach
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              BIH works alongside partner organizations, helping them build practical and sustainable
              initiatives rather than simply providing detached advice.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xs">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A5F]">
                Working Hand-in-Hand With Change-Makers
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Rather than treating project support as an external checklist, our operational approach
                is grounded in six foundational principles:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Collaborative",
                  desc: "We co-create solutions with local teams who possess the deepest understanding of their communities.",
                },
                {
                  title: "Context-Relevant",
                  desc: "We ensure frameworks fit local sociocultural realities, resources, and grassroots operational environments.",
                },
                {
                  title: "Resource-Efficient",
                  desc: "Maximizing the utility of every dollar, volunteer hour, and institutional tool deployed.",
                },
                {
                  title: "Impact-Driven",
                  desc: "Prioritizing tangible, enduring community improvements over superficial metrics or vanity outputs.",
                },
                {
                  title: "Transparent",
                  desc: "Ensuring open milestone reporting, honest feedback loops, and accountable stakeholder communication.",
                },
                {
                  title: "Results-Oriented",
                  desc: "Focusing on verifiable deliverables, measurable community benefit, and sustainable handoff structures.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4A017]" />
                    <h4 className="font-bold text-sm text-[#1E3A5F] uppercase tracking-wide">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 
          SECTION 8: Our Aspiration
      */}
      <section className="py-16 md:py-20 bg-slate-50/60 border-t border-slate-200/70">
        <div className="container max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1E3A5F]/10 text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-[#D4A017]" />
            Growth-Phase Positioning
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1E3A5F] font-bold leading-tight">
            Our Aspiration
          </h2>

          <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
            As a growing social impact startup, Bridge for Impact Hub seeks to work with forward-thinking
            NGOs, social enterprises, academic institutions, and development actors interested in piloting,
            refining, and delivering meaningful, high-impact projects.
          </p>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            By establishing collaborative partnerships today, we are building the operational foundation
            to support grassroots changemakers across Ghana and beyond.
          </p>
        </div>
      </section>

      {/* 
          SECTION 9: Call to Action (Immersive Background Image Treatment)
      */}
      <section className="relative overflow-hidden text-white py-20 sm:py-24 md:py-28">
        {/* Full-width background image with responsive focal point */}
        <div className="absolute inset-0 z-0">
          <img
            src="/aboutpage2.jpg"
            alt="Community collaboration and volunteer teamwork"
            className="w-full h-full object-cover object-center"
          />
          {/* Base darkening layer */}
          <div aria-hidden="true" className="absolute inset-0 bg-[#0B1523]/60" />
          {/* Directional navy gradient overlay ensuring clear text readability */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#0B1523]/95 via-[#162C47]/85 to-[#0B1523]/90"
          />
          {/* Subtle gold bottom accent glow */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(212,160,23,0.18),transparent_70%)] pointer-events-none"
          />
          {/* Top subtle dividing hairline */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />
        </div>

        <div className="container max-w-4xl relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#D4A017] uppercase tracking-wider mx-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017] animate-pulse" />
              Join the Ecosystem
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
              Let&apos;s Turn Ideas Into <span className="text-[#D4A017]">Impact</span>.
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-sans">
              Whether you&apos;re an organization seeking project support, a volunteer looking to
              contribute, or a potential partner interested in meaningful collaboration, there&apos;s
              a place for you in the Bridge for Impact Hub ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-3xl mx-auto">
            <Button
              asChild
              className="bg-[#D4A017] hover:bg-[#c29214] text-white font-semibold h-11 shadow-md hover:shadow-lg transition-all rounded-md"
            >
              <Link to="/projects" className="flex items-center justify-center gap-1.5">
                <FolderKanban className="w-4 h-4" />
                Explore Projects
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xs h-11 font-medium rounded-md"
            >
              <Link to="/register/volunteer" className="flex items-center justify-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#D4A017]" />
                Volunteer Sign-up
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xs h-11 font-medium rounded-md"
            >
              <Link to="/suggest-project" className="flex items-center justify-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-[#D4A017]" />
                Suggest a Project
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-xs h-11 font-medium rounded-md"
            >
              <Link to="/register/ngo" className="flex items-center justify-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#D4A017]" />
                Register as NGO
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
