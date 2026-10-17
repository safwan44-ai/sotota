export const site = {
  nameBn: "সততা",
  nameEn: "Sotota",
  tagline: "বাংলাদেশে অনলাইনে শুটকি মাছ।",

  // Fill these ONCE with your real details.
  address: "",
  phone: "",
  email: "",
  // WhatsApp: digits only, with country code. Example: 8801XXXXXXXXX
  whatsapp: "",
  facebookUrl: "",
  instagramUrl: "",

  // Add names like "বিকাশ" or "নগদ" here ONLY after that payment really works.
  paymentMethods: ["ক্যাশ অন ডেলিভারি"],
};

export type InfoPage = {
  slug: string;
  title: string;
  group: "info" | "support";
};

// Every page listed here appears in the footer and gets its own address.
export const infoPages: InfoPage[] = [
  { slug: "about", title: "আমাদের সম্পর্কে", group: "info" },
  { slug: "contact", title: "যোগাযোগ", group: "info" },
  { slug: "privacy-policy", title: "গোপনীয়তা নীতি", group: "info" },
  { slug: "terms", title: "শর্তাবলি", group: "info" },
  { slug: "how-to-order", title: "কীভাবে অর্ডার করবেন", group: "support" },
  { slug: "track-order", title: "অর্ডার ট্র্যাক", group: "support" },
  { slug: "payment", title: "পেমেন্ট পদ্ধতি", group: "support" },
  {
    slug: "delivery-return-policy",
    title: "ডেলিভারি ও রিটার্ন নীতি",
    group: "support",
  },
  { slug: "faq", title: "সাধারণ প্রশ্ন (FAQ)", group: "support" },
];