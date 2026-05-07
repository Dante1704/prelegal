"use client";

import { useCallback, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import type { Template } from "@/lib/mutual-nda-template";
import NdaChat from "@/components/NdaChat";

interface Props {
  template: Template;
}

export default function NdaCreator({ template }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(template.fields.map((f) => [f.name, ""]))
  );

  const labelByName = useMemo(
    () => Object.fromEntries(template.fields.map((f) => [f.name, f.label])),
    [template.fields]
  );

  const filledContent = useMemo(
    () =>
      template.content.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => values[key] || `[${labelByName[key] ?? key}]`
      ),
    [template.content, values, labelByName]
  );

  const allRequiredFilled = useMemo(
    () =>
      template.fields
        .filter((f) => f.required)
        .every((f) => values[f.name].trim() !== ""),
    [template.fields, values]
  );

  const handleExtract = useCallback(
    (extracted: Record<string, string>) => {
      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(extracted)) {
          if (k in next && typeof v === "string") next[k] = v;
        }
        return next;
      });
    },
    []
  );

  function downloadPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const maxWidth = doc.internal.pageSize.width - margin * 2;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 5.5;

    doc.setFont("times", "normal");
    doc.setFontSize(11);

    let y = margin;

    for (const paragraph of filledContent.split("\n")) {
      if (paragraph.trim() === "") {
        y += lineHeight;
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        continue;
      }

      const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
      for (const line of wrapped) {
        if (y + lineHeight + 2 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    }

    doc.save("mutual-nda.pdf");
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Chat panel */}
      <div className="w-1/2 border-r border-gray-200">
        <NdaChat values={values} onExtract={handleExtract} />
      </div>

      {/* Preview panel */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Document preview</h2>
          <button
            onClick={downloadPdf}
            disabled={!allRequiredFilled}
            title={!allRequiredFilled ? "Fill in all required fields first" : undefined}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-2xl rounded-md bg-white p-8 shadow-sm">
            <pre
              data-testid="nda-preview"
              className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800"
            >
              {filledContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
