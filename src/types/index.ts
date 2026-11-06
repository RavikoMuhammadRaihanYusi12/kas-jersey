export type TxType = 'INCOME' | 'EXPENSE';
export type KasbonStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface Category {
  id: number;
  name: string;
  type: TxType;
  is_system_default: number;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  phone: string | null;
  role: string;
  is_active: number;
  created_at: string;
}

export interface JobModel {
  id: number;
  model_name: string;
  default_rate: number;
  created_at: string;
}

export interface Kasbon {
  id: number;
  employee_id: number;
  date: string;
  total_amount: number;
  remaining_amount: number;
  status: KasbonStatus;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  transaction_date: string;
  type: TxType;
  category_id: number;
  amount: number;
  description: string | null;
  employee_id: number | null;
  created_at: string;
}

export interface PieceRateDetail {
  id: number;
  transaction_id: number;
  model_description: string;
  qty: number;
  rate_per_pcs: number;
  subtotal: number;
}

export interface KasbonSettlement {
  id: number;
  kasbon_id: number;
  transaction_id: number;
  amount_deducted: number;
  date: string;
  created_at: string;
}

export interface PieceRateItem {
  modelDescription: string;
  qty: number;
  ratePerPcs: number;
}

export interface PayrollPayload {
  employeeId: number;
  categoryId: number;
  transactionDate: string;
  items: PieceRateItem[];
  kasbonDeduction: number;
  notes?: string;
}

export interface PayrollResult {
  transactionId: number;
  grossPay: number;
  kasbonDeduction: number;
  netPay: number;
}
