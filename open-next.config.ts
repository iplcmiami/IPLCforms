import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  ...defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
  }),
  edgeExternals: [
    "node:crypto",
    "@pdfme/generator",
    "@pdfme/common",
    "@pdfme/schemas",
    "@pdfme/ui",
    "html2pdf.js",
    "react-to-print"
  ]
};

export default config;