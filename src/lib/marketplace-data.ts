export interface ServiceItem {
  id: string;
  title: string;
  priceRange: string;
  description: string;
  turnaroundTime: string;
}

export const MARKETPLACE_SERVICES: ServiceItem[] = [
  {
    id: "cover-design",
    title: "Professional Book Cover Design",
    priceRange: "$299 - $799",
    description: "Get a stunning, market-ready cover designed by professional book illustrators. Includes front, back, and spine design with 3 revisions.",
    turnaroundTime: "7-10 days",
  },
  {
    id: "isbn",
    title: "ISBN Registration",
    priceRange: "$125",
    description: "Official ISBN assignment for your book, ensuring it can be distributed to retailers worldwide. Includes barcode generation.",
    turnaroundTime: "24-48 hours",
  },
  {
    id: "editing",
    title: "Editing / Proofreading",
    priceRange: "$0.02 - $0.05 per word",
    description: "Comprehensive editing verification including grammar, flow, and structural improvements. Choose from developmental, copy editing, or proofreading.",
    turnaroundTime: "14-21 days",
  },
  {
    id: "author-website",
    title: "Author Website",
    priceRange: "$500 - $1,500",
    description: "A professional, SEO-optimized website to showcase your books and connect with readers. Includes blog setup and newsletter integration.",
    turnaroundTime: "2-3 weeks",
  },
  {
    id: "marketing",
    title: "Marketing Package",
    priceRange: "$499 - $1,299",
    description: "A complete marketing strategy including Amazon ads setup, social media graphics, and a 30-day launch plan to boost your sales.",
    turnaroundTime: "5-7 days",
  },
  {
    id: "social-media",
    title: "Social Media Launch Kit",
    priceRange: "$199 - $399",
    description: "Ready-to-post graphics, captions, and hashtags tailored to your book's genre. Includes 30 days of content.",
    turnaroundTime: "3-5 days",
  },
  {
    id: "publishing-help",
    title: "Publishing Assistance",
    priceRange: "$150 - $450",
    description: "Expert guidance through the Kindle Direct Publishing (KDP) or IngramSpark setup process. We handle metadata, categories, and distribution settings.",
    turnaroundTime: "2-4 days",
  },
  {
    id: "printing",
    title: "Printing Support",
    priceRange: "Custom Quote",
    description: "High-quality offset or digital printing support for bulk orders. Get help with formatting, paper selection, and logistics.",
    turnaroundTime: "Varies",
  },
];
