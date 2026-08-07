"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

/* ─── Types ─────────────────────────────────────────────── */
interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
  icon: string;
}

/* ─── FAQ Data ──────────────────────────────────────────── */
const faqData: FaqItem[] = [
  {
    id: 1,
    category: "መግቢያ",
    question: "Adonay TikTok Academy ምንድን ነው?",
    answer:
      "Adonay TikTok Academy ፈጣሪዎች፣ ንግድ ባለቤቶች፣ ተማሪዎች እና በማህበራዊ ሚዲያ ላይ ተፅዕኖ መፍጠር የሚፈልጉ ሰዎች ፐርሰናል ብራንድ እንዲገነቡ፣ ኮንቴንት እንዲፈጥሩ እና በTikTok እና በሌሎች የማህበራዊ ሚዲያ መድረኮች እንዲያድጉ የሚያግዝ ዘመናዊ የመማሪያ መድረክ ነው።",
    icon: "🎓",
  },
  {
    id: 2,
    category: "ተሳትፎ",
    question: "ኮርሶቹ ለማን ተስማሚ ናቸው?",
    answer:
      "ኮርሶቹ ለጀማሪ ፈጣሪዎች፣ TikTok ማሳደግ ለሚፈልጉ፣ ፐርሰናል ብራንድ ለሚገነቡ፣ ቢዝነሳቸውን በማህበራዊ ሚዲያ ለማሳደግ ለሚፈልጉ፣ ኢንፍሉዌንሰር መሆን ለሚፈልጉ እና በኮንቴንት ፍጠራ ስራ ለሚሰሩ ሁሉ ተስማሚ ናቸው።",
    icon: "🎯",
  },
  {
    id: 3,
    category: "መስፈርቶች",
    question: "ኮርሶቹን ለመከታተል ልምድ ያስፈልጋል?",
    answer:
      "አይፈልግም። ኮርሶቹ ከጀማሪ እስከ ከፍተኛ ደረጃ ድረስ በቀላሉ እንዲከተሉ ተዘጋጅተዋል። ምንም አይነት የቅድመ ልምድ ሳያስፈልግ በቀላሉ መጀመር ይችላሉ።",
    icon: "🚀",
  },
  {
    id: 4,
    category: "ተደራሽነት",
    question: "ኮርሶቹን ከገዛሁ በኋላ ለምን ያህል ጊዜ አገኛቸዋለሁ?",
    answer:
      "ኮርሱን ከገዙ እና ከተመዘገቡ በኋላ ለ30 ቀናት (1 ወር) ሙሉ መዳረሻ ይኖርዎታል። በዚህ ጊዜ ውስጥ ቪዲዮዎቹን እና ሌሎች የኮርስ ቁሳቁሶችን በማንኛውም ጊዜ እና ቦታ መመልከት ይችላሉ። 30 ቀናቱ ከተጠናቀቁ በኋላ የኮርሱ መዳረሻ ይዘጋል።",
    icon: "⏰",
  },
  {
    id: 5,
    category: "ተደራሽነት",
    question: "ኮርሶቹን በስልክ መከታተል እችላለሁ?",
    answer:
      "አዎ። ኮርሶቹ በሞባይል፣ ታብሌት እና ኮምፒውተር ላይ እንዲሰሩ ተዘጋጅተዋል። በማንኛውም መሳሪያ ላይ ምቹ የሆነ የመማር ልምድ ያገኛሉ።",
    icon: "📱",
  },
  {
    id: 6,
    category: "ውጤት",
    question: "ከኮርሱ በኋላ ውጤት አገኛለሁ?",
    answer:
      "ውጤት በተማሪው ትጋት፣ ቀጣይነት እና ተግባራዊ አፈጻጸም ላይ ይመሰረታል። ነገር ግን በኮርሱ ውስጥ የሚሰጡት ስልቶች በተግባር የተፈተኑ እና ውጤታማ ዘዴዎች ናቸው። ተማሪዎቻችን በአጭር ጊዜ ውስጥ አስደናቂ ውጤት ሲያስመዘግቡ ተመልክተናል።",
    icon: "📊",
  },
  {
    id: 7,
    category: "ትምህርት",
    question: "የሚሰጡት ትምህርቶች ቲዎሪ ናቸው ወይስ ተግባራዊ?",
    answer:
      "የአካዳሚው ዋና ትኩረት ተግባራዊ እና ውጤት ተኮር ትምህርት ላይ ነው። የሚማሩትን ነገር ወዲያውኑ በራስዎ ኮንቴንት ላይ መተግበር ይችላሉ። እያንዳንዱ ትምህርት ተግባራዊ ምሳሌዎችን እና የእውነተኛ ህይወት ጉዳዮችን ያካትታል።",
    icon: "⚡",
  },
  {
    id: 8,
    category: "ርዕሶች",
    question: "የትኞቹን ርዕሶች እማራለሁ?",
    answer:
      "የሚከተሉትን ርዕሶች ይማራሉ: TikTok Growth Strategy፣ Personal Branding፣ Viral Content Creation፣ Storytelling፣ Content Psychology፣ Audience Building፣ Camera Confidence፣ Creator Monetization እና Social Media Growth። እያንዳንዱ ርዕስ ከሌላው ጋር ተያይዞ ሙሉ የእውቀት ስርዓት ይፈጥራል።",
    icon: "📚",
  },
  {
    id: 9,
    category: "ክፍያ",
    question: "የትኞቹን የክፍያ አማራጮች መጠቀም እችላለሁ?",
    answer:
      "ለተማሪዎቻችን ምቹ የሆኑ የክፍያ አማራጮችን እናቀርባለን። በኢትዮጵያ ያሉ ተማሪዎች በ Telebirr እና CBE መክፈል ይችላሉ። ከኢትዮጵያ ውጭ ያሉ ተማሪዎች (Diaspora) ደግሞ በ PayPal እና Stripe በኩል ደህንነቱ በተጠበቀ መንገድ ክፍያ ማጠናቀቅ ይችላሉ። ለተጨማሪ እርዳታ የድጋፍ ቡድናችንን ያነጋግሩ።",
    icon: "💳",
  },
  {
    id: 10,
    category: "ድጋፍ",
    question: "እርዳታ ካስፈለገ እንዴት ማግኘት እችላለሁ?",
    answer:
      "የድጋፍ ቡድናችን ለተማሪዎቻችን ሁልጊዜ ለመርዳት ዝግጁ ነው። ለማንኛውም ጥያቄ፣ የኮርስ እገዛ ወይም ቴክኒካዊ ድጋፍ በ WhatsApp 09xxxxxxx ሊያገኙን ይችላሉ። እንዲሁም በኢሜይል ወይም በሌሎች የግንኙነት መንገዶች ከእኛ ጋር መገናኘት ይችላሉ።",
    icon: "💬",
  },
  {
    id: 11,
    category: "ምርጫ",
    question: "ለምን Adonay TikTok Academy እመርጣለሁ?",
    answer:
      "ምክንያቱም የሚሰጡት ትምህርቶች ከቲዎሪ የተለየ፣ በቢሊዮኖች እይታዎች የተፈተነ እና በተግባር ውጤት ያሳየ ልምድ ላይ የተመሰረቱ ናቸው። ዓላማችን ተከታዮችን ብቻ ማሳደግ አይደለም፤ የማይረሳ ፐርሰናል ብራንድ እንዲገነቡ ማገዝ ነው።",
    icon: "🏆",
  },
];

/* ─── Particle Field ───────────────────────────────────── */
function ParticleField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#ef4444]/20 blur-[1px]"
          style={{
            left: `${(i * 13 + 7) % 100}%`,
            top: `${(i * 19 + 11) % 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, i % 2 === 0 ? 20 : -20, 0],
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 5 + (i % 5),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 6) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Section Divider ──────────────────────────────────── */
function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#dc2626]/40 to-transparent" />
      <div className="w-2 h-2 rounded-full bg-[#dc2626] rotate-45" />
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#dc2626]/40 to-transparent" />
    </div>
  );
}

/* ─── Floating Badge ───────────────────────────────────── */
function FloatingBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 text-white/90 text-sm ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      {label}
    </motion.div>
  );
}

/* ─── Accordion Item ───────────────────────────────────── */
function AccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group rounded-2xl border transition-all duration-300 ${
        isOpen
          ? "border-[#dc2626]/40 bg-gradient-to-br from-[#dc2626]/10 via-[#dc2626]/5 to-transparent shadow-lg shadow-[#dc2626]/10"
          : "border-white/10 bg-white/5 hover:bg-white/[0.07] hover:border-white/20"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 sm:px-7 py-5 sm:py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]/50 rounded-2xl"
        aria-expanded={isOpen}
      >
        {/* Icon */}
        <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#dc2626]/20 to-[#ef4444]/10 flex items-center justify-center text-lg sm:text-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
          {item.icon}
        </span>

        {/* Question */}
        <div className="flex-1 min-w-0">
          <span
            className={`block text-sm sm:text-base font-semibold transition-colors duration-300 ${
              isOpen ? "text-[#ef4444]" : "text-white/80 group-hover:text-white"
            }`}
          >
            {item.question}
          </span>
          {/* Category badge - visible on mobile in compact mode */}
          <span className="sm:hidden inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
            {item.category}
          </span>
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isOpen
              ? "bg-[#dc2626] text-white"
              : "bg-white/10 text-white/50 group-hover:bg-white/20 group-hover:text-white/80"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-7 pb-6 sm:pb-7">
              <div className="h-px bg-gradient-to-r from-[#dc2626]/30 via-[#dc2626]/10 to-transparent mb-4" />
              <p className="text-sm sm:text-base text-white/70 leading-relaxed sm:leading-loose">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Contact Card ─────────────────────────────────────── */
function ContactCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-[#dc2626]/20 bg-gradient-to-br from-[#dc2626]/10 via-[#dc2626]/5 to-transparent p-8 sm:p-12"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#dc2626]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ef4444]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30 text-[#ef4444] text-xs sm:text-sm font-medium mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
            ድጋፍ ያግኙ
          </motion.span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            አሁንም ጥያቄ አለዎት?
          </h3>
          <p className="text-white/60 max-w-lg mx-auto">
            የድጋፍ ቡድናችን ሁልጊዜ ለመርዳት ዝግጁ ነው። በማንኛውም ጊዜ ሊያገኙን ይችላሉ።
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {/* Email */}
          <motion.a
            href="mailto:support@adonayacademy.com"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#dc2626]/30 hover:bg-[#dc2626]/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-[#dc2626]/20 flex items-center justify-center group-hover:bg-[#dc2626]/30 transition-colors">
              <svg
                className="w-6 h-6 text-[#dc2626]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm sm:text-base text-white/80 group-hover:text-[#ef4444] transition-colors font-medium">
                support@adonayacademy.com
              </p>
            </div>
          </motion.a>

          {/* WhatsApp */}
          <motion.a
            href="#"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#dc2626]/30 hover:bg-[#dc2626]/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-[#dc2626]/20 flex items-center justify-center group-hover:bg-[#dc2626]/30 transition-colors">
              <svg
                className="w-6 h-6 text-[#dc2626]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                WhatsApp
              </p>
              <p className="text-sm sm:text-base text-white/80 group-hover:text-[#ef4444] transition-colors font-medium">
                +251 XX XXX XXXX
              </p>
            </div>
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN FAQ PAGE
   ══════════════════════════════════════════════════════════ */
export default function FaqPage() {
  const [activeId, setActiveId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setActiveId(activeId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative pt-24 pb-8 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-[#dc2626]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-40 w-[30rem] h-[30rem] bg-[#ef4444]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-[#dc2626]/5 rounded-full blur-3xl" />
        </div>

        <FloatingBadge label="📚 11+ ጥያቄዎች" className="top-24 right-8" />
        <FloatingBadge label="⚡ ፈጣን ምላሽ" className="bottom-32 left-8" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <AnimatedSection direction="up" duration={0.6}>
            <div className="text-center mb-8 sm:mb-10">
              {/* Section tag */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30 text-[#ef4444] text-xs sm:text-sm font-medium mb-4 sm:mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
                ተደጋጋሚ ጥያቄዎች
              </motion.span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight">
                መልስ ያግኙ{" "}
                <span className="bg-gradient-to-r from-[#7f1d1d] to-[#dc2626] bg-clip-text text-transparent">
                  ያፍሩ
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
                ስለ Adonay TikTok Academy በተደጋጋሚ የሚጠየቁ ጥያቄዎች መልስ ያግኙ።
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════ FAQ LIST SECTION ═══════════════ */}
      <section className="relative pb-16 sm:pb-24">
        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 sm:space-y-4">
          <StaggerContainer staggerDelay={0.04}>
            {faqData.map((item, index) => (
              <StaggerItem key={item.id}>
                <AccordionItem
                  item={item}
                  isOpen={activeId === item.id}
                  onToggle={() => toggleFaq(item.id)}
                  index={index}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* ═══════════════ DIVIDER ═══════════════ */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 my-12 sm:my-16">
          <SectionDivider />
        </div>

        {/* ═══════════════ CONTACT SECTION ═══════════════ */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContactCard />
        </div>

        {/* ═══════════════ CTA SECTION ═══════════════ */}
        <AnimatedSection direction="up" delay={0.2}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 text-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="inline-flex items-center gap-3 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#dc2626]/20 via-[#ef4444]/10 to-[#dc2626]/20 border border-[#dc2626]/30 hover:border-[#dc2626]/50 transition-all duration-300 cursor-pointer"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <p className="text-white font-semibold text-sm sm:text-base">
                  ለመጀመር ዝግጁ ነዎት?
                </p>
                <Link
                  href="/courses"
                  className="text-[#ef4444] hover:text-[#dc2626] text-xs sm:text-sm underline underline-offset-4 decoration-[#dc2626]/30 hover:decoration-[#dc2626] transition-all"
                >
                  ኮርሶቻችንን ይመልከቱ →
                </Link>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
