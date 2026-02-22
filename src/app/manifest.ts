import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dubai Mobile Shop POS",
    short_name: "POS",
    description: "Cloud POS system for Dubai mobile shops",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon", purpose: "any" },
    ],
  };
}
