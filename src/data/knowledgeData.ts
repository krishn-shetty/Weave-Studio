export interface KnowledgeFile {
  id: string;
  name: string;
  sizeBytes: number;
  modified: string;
  type: 'pdf' | 'markdown' | 'txt' | 'csv';
  usedByBases: string[];
}

export interface KnowledgeSearchHit {
  id: string;
  source: string;
  score: number;
  passage: string;
  location?: string;
}

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  type: 'vector_store' | 'rag_api';
  description: string;
  status: 'ready' | 'building' | 'needs_rebuild';
  lastBuilt: string | null;
  passagesCount: number;
  embeddingModel: string;
  files: string[];
  agentsUsing: string[];
}

export const initialKnowledgeFiles: KnowledgeFile[] = [
  {
    id: 'f-1',
    name: 'northwind_billing_faq_2026.md',
    sizeBytes: 124800,
    modified: '2026-10-18T14:32:00Z',
    type: 'markdown',
    usedByBases: ['billing_policies', 'customer_care_docs']
  },
  {
    id: 'f-2',
    name: 'tariffs_and_metering_guide_v4.pdf',
    sizeBytes: 489200,
    modified: '2026-10-15T09:12:00Z',
    type: 'pdf',
    usedByBases: ['billing_policies']
  },
  {
    id: 'f-3',
    name: 'emergency_outage_protocols.md',
    sizeBytes: 64500,
    modified: '2026-10-12T16:45:00Z',
    type: 'markdown',
    usedByBases: ['customer_care_docs']
  },
  {
    id: 'f-4',
    name: 'harbour_clinic_patient_handbook.pdf',
    sizeBytes: 312000,
    modified: '2026-10-10T11:20:00Z',
    type: 'pdf',
    usedByBases: ['clinic_docs']
  },
  {
    id: 'f-5',
    name: 'dental_insurance_copays_2026.csv',
    sizeBytes: 88400,
    modified: '2026-10-08T08:00:00Z',
    type: 'csv',
    usedByBases: ['clinic_docs']
  }
];

export const initialKnowledgeBases: KnowledgeBaseItem[] = [
  {
    id: 'billing_policies',
    name: 'Billing Policies & Rates',
    type: 'vector_store',
    description: 'Direct debits, dispute timelines, estimated meter readings, and tariff comparisons.',
    status: 'ready',
    lastBuilt: '2026-10-19T06:15:00Z',
    passagesCount: 168,
    embeddingModel: 'text-embedding-3-small (1536 dim)',
    files: ['northwind_billing_faq_2026.md', 'tariffs_and_metering_guide_v4.pdf'],
    agentsUsing: ['customer-care', 'lead-concierge']
  },
  {
    id: 'customer_care_docs',
    name: 'Care & Emergency Protocols',
    type: 'vector_store',
    description: 'Gas emergency advice, vulnerable customer registrar, and complaints escalation.',
    status: 'ready',
    lastBuilt: '2026-10-18T18:00:00Z',
    passagesCount: 94,
    embeddingModel: 'text-embedding-3-small (1536 dim)',
    files: ['northwind_billing_faq_2026.md', 'emergency_outage_protocols.md'],
    agentsUsing: ['customer-care']
  },
  {
    id: 'clinic_docs',
    name: 'Harbour Clinic Patient Policies',
    type: 'vector_store',
    description: 'Appointment cancellation windows, out of hours emergency dentist numbers, and copays.',
    status: 'ready',
    lastBuilt: '2026-10-14T10:30:00Z',
    passagesCount: 112,
    embeddingModel: 'text-embedding-3-small (1536 dim)',
    files: ['harbour_clinic_patient_handbook.pdf', 'dental_insurance_copays_2026.csv'],
    agentsUsing: ['clinic-front-desk', 'booking-concierge']
  }
];

export const sampleQueryMatches: Record<string, KnowledgeSearchHit[]> = {
  bill: [
    {
      id: 'h-1',
      source: 'northwind_billing_faq_2026.md',
      score: 0.94,
      location: 'Section 3.2: Direct Debit Billing Windows',
      passage: 'Direct debits are processed on the 1st or 15th of each calendar month. Customers receive an advance billing statement 10 working days prior to collection. If payment fails, an automated retry occurs 5 days later with no fee assessed.'
    },
    {
      id: 'h-2',
      source: 'tariffs_and_metering_guide_v4.pdf',
      score: 0.82,
      location: 'Page 12: Estimated vs Actual Usage Adjustments',
      passage: 'When an actual meter reading is supplied, any discrepancy with previous estimates is balanced on the immediate next monthly statement. Credits over £50 are automatically refunded upon request.'
    },
    {
      id: 'h-3',
      source: 'northwind_billing_faq_2026.md',
      score: 0.61,
      location: 'Section 4.1: Dispute Timeline',
      passage: 'Customers may lodge a formal billing dispute within 30 days of invoice date. Disputed amounts are held from collections while review proceeds.'
    }
  ],
  outage: [
    {
      id: 'h-4',
      source: 'emergency_outage_protocols.md',
      score: 0.96,
      location: 'Protocol 1: Power Outages & Priority Services',
      passage: 'Customers experiencing sudden loss of power should check their trip switch before calling. Priority Services Register customers with medical electrical equipment are dispatched a mobile generator within 4 hours.'
    },
    {
      id: 'h-5',
      source: 'emergency_outage_protocols.md',
      score: 0.89,
      location: 'Protocol 2: Suspected Gas Leaks',
      passage: 'CRITICAL: If the caller smells gas or suspects a carbon monoxide leak, instruct them immediately: (1) Turn off gas at emergency control valve, (2) Extinguish naked flames, (3) Do NOT switch electrical lights on or off, (4) Open doors and windows, (5) Evacuate and call National Gas Emergency at 0800 111 999.'
    }
  ],
  appointment: [
    {
      id: 'h-6',
      source: 'harbour_clinic_patient_handbook.pdf',
      score: 0.93,
      location: 'Chapter 2: Booking and Cancellations',
      passage: 'Routine check-ups can be scheduled up to 6 months in advance. Cancellations require at least 24 hours notice to avoid a £25 late cancellation charge. Emergency toothache slots are released every weekday at 08:30 AM.'
    },
    {
      id: 'h-7',
      source: 'dental_insurance_copays_2026.csv',
      score: 0.77,
      location: 'Table: NHS Bandings & Private Tier 1',
      passage: 'Band 1 Diagnosis & Prevention: £26.80. Band 2 Fillings & Root Canals: £73.50. Band 3 Crowns & Dentures: £319.10. Private initial examination: £45.00.'
    }
  ],
  default: [
    {
      id: 'h-def-1',
      source: 'northwind_billing_faq_2026.md',
      score: 0.88,
      location: 'Section 1: General Account Enquiries',
      passage: 'Northwind Energy provides renewable electricity and gas to commercial and residential customers throughout the UK. Callers should provide their 10-digit account number or postcode to verify account identity.'
    },
    {
      id: 'h-def-2',
      source: 'emergency_outage_protocols.md',
      score: 0.74,
      location: 'Section 5: Support Hours & Escalations',
      passage: 'Customer Care lines operate Monday through Friday 08:00 to 18:00, Saturday 09:00 to 14:00. Out of hours calls are routed to the 24/7 automated emergency line.'
    }
  ]
};
