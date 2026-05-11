const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "textarea";
  required: boolean;
}

export interface TemplateSummary {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface Template extends TemplateSummary {
  fields: TemplateField[];
  content: string;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const res = await fetch(`${API_BASE}/api/templates`);
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

export async function getTemplate(id: string): Promise<Template> {
  const res = await fetch(`${API_BASE}/api/templates/${id}`);
  if (!res.ok) throw new Error(`Failed to load template: ${id}`);
  return res.json();
}
