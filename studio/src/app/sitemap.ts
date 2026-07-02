import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl();
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/dashboard/home`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/dashboard/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
