import { useEffect } from "react";

const SITE_TITLE = "SUKIMA SWITCH CALL GUIDE";

export function PageMeta({
  title,
  description,
}: {
  title?: string;
  description: string;
}) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_TITLE}` : SITE_TITLE;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [description, title]);

  return null;
}
