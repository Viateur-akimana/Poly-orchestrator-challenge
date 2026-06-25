import React from 'react';
import { Header } from '@/components/Header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone, ShieldCheck, Clock, CreditCard } from 'lucide-react';

const HelpCenter = () => {
    const faqs = [
        {
            question: "How long does a transfer take?",
            answer: "Most transfers from Sberbank to Rwanda Mobile Money (MTN/Airtel) are completed within 5-15 minutes after we verify your payment. In some cases, it might take up to 1 hour depending on network congestion.",
            icon: <Clock className="w-5 h-5 text-primary" />
        },
        {
            question: "What are the transfer limits?",
            answer: "The minimum transfer amount is 500 RUB. Maximum limits depend on your account verification level, starting at 50,000 RUB per day for new users.",
            icon: <ShieldCheck className="w-5 h-5 text-primary" />
        },
        {
            question: "Which payment methods do you accept?",
            answer: "Currently, we accept payments via Sberbank (Card to Card or Phone number). You will receive the specific card details to pay into once you initiate a transfer.",
            icon: <CreditCard className="w-5 h-5 text-primary" />
        },
        {
            question: "Is my money safe?",
            answer: "Yes. We use industry-standard encryption and secure payment gateways. Every transfer is tracked, and our support team is available 24/7 to assist you.",
            icon: <ShieldCheck className="w-5 h-5 text-primary" />
        }
    ];

    return (
        <div className="min-h-screen bg-background-dark text-white">
            <Header />

            <main className="max-w-4xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
                    <p className="text-slate-400 text-lg">Everything you need to know about SKYLINE transfers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <MessageCircle className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-bold mb-2">WhatsApp Support</h3>
                        <p className="text-sm text-slate-400 mb-4">Instant chat with our team</p>
                        <a href="https://wa.me/250780000000" className="text-primary font-medium hover:underline">Start Chat</a>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-bold mb-2">Email Support</h3>
                        <p className="text-sm text-slate-400 mb-4">Response within 24 hours</p>
                        <a href="mailto:support@skylinemoneytransfer.com" className="text-primary font-medium hover:underline">Email Us</a>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Phone className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-bold mb-2">Phone Support</h3>
                        <p className="text-sm text-slate-400 mb-4">Available 9AM - 6PM CAT</p>
                        <a href="tel:+250780000000" className="text-primary font-medium hover:underline">Call Us</a>
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                    <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="space-y-4">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border-white/10">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-4 text-left">
                                        {faq.icon}
                                        <span className="font-medium">{faq.question}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-400 pl-9 pb-4">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 text-center">
                <p className="text-slate-500 text-sm">© {new Date().getFullYear()} SKYLINE Transfers. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default HelpCenter;
