"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import type { Template } from "@/lib/mutual-nda-template";

interface Props {
  template: Template;
}

export default function NdaCreator({ template }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(template.fields.map((f) => [f.name, ""]))
  );

  const filledContent = template.content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const field = template.fields.find((f) => f.name === key);
    return values[key] || `[${field?.label ?? key}]`;
  });

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 5.5;

    doc.setFont("times", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(filledContent, maxWidth) as string[];
    let y = margin;

    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save("mutual-nda.pdf");
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Form panel */}
      <div className="w-1/2 overflow-y-auto border-r border-gray-200 p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Enter details</h2>
        <p className="mb-6 text-sm text-gray-500">{template.description}</p>

        <div className="space-y-5">
          {template.fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              ) : (
                <input
                  type={field.type}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview panel */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Document preview</h2>
          <button
            onClick={downloadPdf}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Download PDF
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-2xl rounded-md bg-white p-8 shadow-sm">
            <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800">
              {filledContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
