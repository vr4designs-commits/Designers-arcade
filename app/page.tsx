import Script from "next/script";
import lawsData from "@/content/laws.json";
import type { Law } from "@/lib/types";
import { markup } from "./markup";

const laws = lawsData as Law[];

// The principle count in the markup follows content/laws.json.
const html = markup.replaceAll("28 PRINCIPLES", `${laws.length} PRINCIPLES`).replace(">28</span>", `>${laws.length}</span>`);

// Escape "<" so no principle text can close the JSON script tag.
const lawsJson = JSON.stringify(laws).replace(/</g, "\\u003c");

export default function Home() {
  return (
    <>
      <script id="laws-data" type="application/json" dangerouslySetInnerHTML={{ __html: lawsJson }} />
      <div id="app-root" dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/arcade.js" strategy="afterInteractive" />
    </>
  );
}
