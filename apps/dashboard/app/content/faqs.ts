export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "Where do I find my license key?",
    answer:
      "Open API Keys in the menu. Each plugin you bought has its own key. Use the copy button next to a key and paste it into the plugin settings.",
  },
  {
    question: "On how many sites can I use one key?",
    answer:
      "A key can be activated on 3 domains by default. Activating it again on a domain that already uses it does not count. If you need more domains, ask support.",
  },
  {
    question: "I moved my site. How do I free the activations?",
    answer:
      "Regenerate the key. You get a new key with all activations free again, and the old key stops working on every site, so update the key in each plugin.",
  },
  {
    question: "My key has expired. What now?",
    answer: "Choose Extend in the key's menu. The key is renewed for another term and starts working again.",
  },
  {
    question: "Why is my key inactive?",
    answer:
      "Inactive keys are paused and do not work in the plugin. Choose Activate in the key's menu to turn it back on.",
  },
  {
    question: "How do I get a key for another platform?",
    answer: "Buy the plugin for that platform. The key is added to your account automatically after the purchase.",
  },
];
