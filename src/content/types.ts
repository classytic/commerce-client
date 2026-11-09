import type { RequestOptions } from "@classytic/arc-next/api";

export interface ScalarContentField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "image";
  required?: boolean;
  maxLength?: number;
}
export interface ReferenceContentField {
  key: string;
  label: string;
  type: "references";
  resource: "categories" | "collections" | "products";
  required?: boolean;
  maxItems: number;
}
export type SectionContentField = ScalarContentField | ReferenceContentField;
export interface SectionTemplate {
  key: string;
  label: string;
  fields: readonly SectionContentField[];
}
export interface SectionsContentField {
  key: "sections";
  label: string;
  type: "sections";
  maxItems: number;
  sections: readonly SectionTemplate[];
}
export type ContentField = SectionContentField | SectionsContentField;
export interface ContentTemplate {
  key: string;
  label: string;
  version: number;
  fields: readonly ContentField[];
}
export interface ContentImage {
  url: string;
  alt?: string;
}
type Section<T extends string, D> = {
  id: string;
  type: T;
  hidden?: boolean;
  data: D;
};
export type PageSection =
  | Section<
      "hero",
      {
        heading: string;
        description?: string;
        image?: ContentImage | null;
        buttonLabel?: string;
        buttonHref?: string;
      }
    >
  | Section<
      "banner",
      { heading: string; image?: ContentImage | null; href?: string }
    >
  | Section<"text", { heading: string; body: string }>
  | Section<"category-grid", { heading: string; categorySlugs: string[] }>
  | Section<"collection", { heading: string; collectionSlugs: string[] }>;
export interface StorefrontPageContent {
  sections: PageSection[];
}
export type ContentReadOptions = Pick<
  RequestOptions,
  "signal" | "cache" | "next"
>;
export interface ContentInput {
  contentTypeKey: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
}
export interface ContentEntry extends ContentInput {
  _id: string;
  __v: number;
  status: "draft" | "published" | "archived";
  publishedVersion?: number;
  publishedAt?: string;
  updatedAt: string;
}
export interface PublishedContent<T = Record<string, unknown>> {
  id: string;
  type: string;
  slug: string;
  title: string;
  content: T;
  publishedAt: string;
}
