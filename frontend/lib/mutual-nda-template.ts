export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "textarea";
  required: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  content: string;
}

const mutualNdaTemplate: Template = {
  id: "mutual_nda",
  name: "Mutual Non-Disclosure Agreement",
  description:
    "A mutual confidentiality agreement where both parties agree to protect each other's confidential information.",
  fields: [
    { name: "party_a_name", label: "Party A Name", type: "text", required: true },
    { name: "party_a_address", label: "Party A Address", type: "text", required: true },
    { name: "party_b_name", label: "Party B Name", type: "text", required: true },
    { name: "party_b_address", label: "Party B Address", type: "text", required: true },
    { name: "effective_date", label: "Effective Date", type: "date", required: true },
    { name: "purpose", label: "Purpose of Disclosure", type: "textarea", required: true },
    {
      name: "confidentiality_period_years",
      label: "Confidentiality Period (Years)",
      type: "number",
      required: true,
    },
    {
      name: "governing_law_state",
      label: "Governing Law (State / Country)",
      type: "text",
      required: true,
    },
  ],
  content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}}, located at {{party_a_address}} ("Party A"),

and

{{party_b_name}}, located at {{party_b_address}} ("Party B").

Party A and Party B are referred to individually as a "Party" and collectively as the "Parties."

1. PURPOSE
The Parties wish to explore a potential business relationship and, in connection with that relationship, each Party may disclose to the other certain confidential and proprietary information. The purpose of this Agreement is to protect such information from unauthorised disclosure. Specifically: {{purpose}}.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any data or information, oral or written, disclosed by either Party to the other that relates to a Party's business, including but not limited to: technical data, trade secrets, know-how, research, product plans, products, services, customers, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, marketing, finances, or other business information.

3. MUTUAL OBLIGATIONS
Each Party (in its capacity as a Receiving Party) agrees to:
a) Hold the other Party's Confidential Information in strict confidence;
b) Not disclose the Confidential Information to any third parties without the prior written consent of the Disclosing Party;
c) Use the Confidential Information solely for the purpose described in Section 1;
d) Protect the Confidential Information with at least the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care.

4. EXCLUSIONS
Confidential Information does not include information that:
a) Is or becomes publicly known through no breach of this Agreement;
b) Was rightfully known by the Receiving Party before disclosure;
c) Is received from a third party without restriction;
d) Is independently developed by the Receiving Party without use of the Confidential Information;
e) Is required to be disclosed by law or court order, provided the Receiving Party gives prompt prior written notice to the Disclosing Party.

5. TERM
This Agreement shall remain in effect for {{confidentiality_period_years}} year(s) from the Effective Date.

6. RETURN OF INFORMATION
Upon written request by either Party, the other Party shall promptly return or destroy all Confidential Information and any copies thereof.

7. NO LICENCE
Nothing in this Agreement grants either Party any rights in or to the other Party's Confidential Information except as expressly set forth herein.

8. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of {{governing_law_state}}, without regard to its conflict of law provisions.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties concerning its subject matter and supersedes all prior agreements and understandings.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

_______________________________
{{party_a_name}}
Party A
Date: _______________

_______________________________
{{party_b_name}}
Party B
Date: _______________`,
};

export default mutualNdaTemplate;
