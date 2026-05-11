"use client";

import { useCallback, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import DocumentChat from "@/components/DocumentChat";
import { getTemplate, type Template } from "@/lib/templates";

export default function DocumentCreator() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const labelByName = useMemo(
    () => Object.fromEntries((template?.fields ?? []).map((f) => [f.name, f.label])),
    [template]
  );

  const filledContent = useMemo(() => {
    if (!template) return "";
    return template.content.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => values[key] || `[${labelByName[key] ?? key}]`
    );
  }, [template, values, labelByName]);

  const allRequiredFilled = useMemo(() => {
    if (!template) return false;
    return template.fields
      .filter((f) => f.required)
      .every((f) => (values[f.name] ?? "").trim() !== "");
  }, [template, values]);

  const handleExtract = useCallback((extracted: Record<string, string>) => {
    setValues((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(extracted)) {
        if (k in next && typeof v === "string") next[k] = v;
      }
      return next;
    });
  }, []);

  const handleSelectTemplate = useCallback(
    (id: string) => {
      if (template?.id === id) return;
      void getTemplate(id)
        .then((t) => {
          setTemplate(t);
          setValues(Object.fromEntries(t.fields.map((f) => [f.name, ""])));
          setLoadError(null);
        })
        .catch((err) => {
          setLoadError(err instanceof Error ? err.message : "Failed to load template");
        });
    },
    [template]
  );

  function downloadPdf() {
    if (!template) return;
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

    doc.save(`${template.id}.pdf`);
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Chat panel */}
      <div className="w-1/2 border-r border-gray-200">
        <DocumentChat
          templateId={template?.id ?? null}
          values={values}
          onExtract={handleExtract}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>

      {/* Preview panel */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {template ? template.name : "Document preview"}
          </h2>
          <button
            onClick={downloadPdf}
            disabled={!template || !allRequiredFilled}
            title={
              !template
                ? "Pick a document in chat first"
                : !allRequiredFilled
                ? "Fill in all required fields first"
                : undefined
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-2xl rounded-md bg-white p-8 shadow-sm">
            {loadError && <div className="mb-4 text-sm text-red-600">{loadError}</div>}
            {template ? (
              <pre
                data-testid="document-preview"
                className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800"
              >
                {filledContent}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">
                Tell the assistant which document you want to create, and a preview will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
