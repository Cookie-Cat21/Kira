import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "How does delivery work?",
    a: "Kira checks live delivery to your city and date before you pay. Perishable items may have earlier cut-off times.",
  },
  {
    q: "Can I send gifts from overseas?",
    a: "Yes. Pay online and Kapruka delivers within Sri Lanka. Kira can walk you through checkout and send a payment link.",
  },
  {
    q: "How do I track my order?",
    a: "Use Track in the menu or tell Kira your order number (for example KP12345) for a live status timeline.",
  },
  {
    q: "What is Kira?",
    a: "Kira is Kapruka's AI shopping companion. She searches the real catalog, checks delivery, adds to your cart, and helps you checkout.",
  },
];

export default function ShopFaq() {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-kira-text">Common questions</h4>
      <Accordion type="single" collapsible className="mt-3 w-full">
        {FAQ.map((item, i) => (
          <AccordionItem key={item.q} value={`faq-${i}`}>
            <AccordionTrigger className="text-[15px] font-medium text-kira-text hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-kira-text-2">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
