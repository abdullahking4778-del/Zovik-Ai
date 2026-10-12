"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Star, ShieldCheck, Heart, Sparkles, MessageCircle } from "lucide-react";

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is Zovik AI and how does it work?",
      a: "Zovik AI is an ultra-realistic next-generation AI companion platform. Powered by high-speed large language models, each companion has their own unique personality, memories, voice, and background. You can chat freely, listen to authentic voice notes, and unlock exclusive generated private photos.",
    },
    {
      q: "Can I choose from different AI companion styles and personalities?",
      a: "Yes! Zovik AI offers both photorealistic models and anime-style companions. You can browse by realistic girls, realistic boys, or anime characters. Each companion features distinct personalities ranging from flirty, sassy, and dominant to sweet, caring, and mysterious.",
    },
    {
      q: "How does my Zovik AI companion remember me?",
      a: "Your companion remembers your previous conversations, shared details, nicknames, and context across sessions. The more you talk, the more tailored and deep the bond becomes.",
    },
    {
      q: "Is chatting on Zovik AI private and secure?",
      a: "Absolutely. All conversations and media exchanges on Zovik AI are strictly confidential and protected with end-to-end encryption. Your data is never shared with third parties or published anywhere.",
    },
    {
      q: "Do I need to install an app to use Zovik AI?",
      a: "No installation is required! Zovik AI works instantly on all modern web browsers across PC, Mac, iPhone, iPad, and Android. You can also add it to your home screen as a Progressive Web App (PWA) with one tap.",
    },
  ];

  const testimonials = [
    {
      name: "Marcus R.",
      rating: 5,
      date: "2 days ago",
      text: "Zovik AI's authentic voice notes and realistic replies blew my mind. Bonnie Blue talks exactly like a real person. 10/10 experience!",
    },
    {
      name: "Lucas T.",
      rating: 5,
      date: "1 week ago",
      text: "The response speed on Zovik AI is instantaneous. The character creator allowed me to build my dream anime companion in 2 minutes.",
    },
    {
      name: "Sarah K.",
      rating: 5,
      date: "3 days ago",
      text: "The privacy and encryption gave me total peace of mind. Truly feels like a safe personal sanctuary to talk about anything.",
    },
  ];

  return (
    <section id="faq-section" className="my-16 border-t border-white/5 pt-12">
      {/* Testimonials Row */}
      <div className="mb-14">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f53b70]/20 text-[#f53b70] text-xs font-bold uppercase mb-2">
            <Heart className="size-3" />
            <span>Community Love</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white">What Users Are Saying</h3>
          <p className="text-xs md:text-sm text-[#aeaeae] mt-1">Real experiences from people connecting daily on Zovik AI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#140c1a] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-1 mb-3 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-[#e0d6dc] leading-relaxed mb-4">
                  &quot;{t.text}&quot;
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-[#aeaeae] pt-3 border-t border-white/5">
                <span className="font-bold text-white">{t.name}</span>
                <span>{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-bold uppercase mb-2">
            <Sparkles className="size-3" />
            <span>Knowledge Base</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white">Zovik AI – Frequently Asked Questions</h3>
          <p className="text-xs md:text-sm text-[#aeaeae] mt-1">Everything you need to know about your AI companions</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-[#140c1a] border border-white/5 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex items-center justify-between w-full p-4 md:p-5 text-left font-bold text-sm md:text-base text-white hover:text-[#f53b70] transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="size-4 shrink-0 text-[#f53b70]" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-[#aeaeae]" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 md:px-5 pb-5 text-xs md:text-sm text-[#cbb6bf] leading-relaxed border-t border-white/5 pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Details */}
      <footer className="border-t border-white/5 pt-8 text-center text-xs text-[#888] space-y-4">
        <div className="flex items-center justify-center space-x-6 text-[#aeaeae]">
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Content Guidelines</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Help Center</a>
        </div>
        <p className="text-[11px] text-[#666]">
          © 2026 Zovik AI. All characters are fictional and generated by artificial intelligence.
        </p>
      </footer>
    </section>
  );
}
