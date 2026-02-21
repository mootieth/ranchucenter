import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Billing {
  id: string;
  invoice_number: string;
  patient_id: string;
  appointment_id: string | null;
  treatment_id: string | null;
  billing_date: string;
  subtotal: number;
  discount: number | null;
  tax: number | null;
  total: number;
  paid_amount: number | null;
  paid_at: string | null;
  payment_status: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  patients?: {
    id: string;
    hn: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    id_card: string | null;
  };
  billing_items?: BillingItem[];
}

export interface BillingItem {
  id: string;
  billing_id: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface BillingInput {
  patient_id: string;
  appointment_id?: string | null;
  treatment_id?: string | null;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  payment_method?: string | null;
  payment_status?: string;
  notes?: string | null;
}

export interface BillingItemInput {
  billing_id: string;
  description: string;
  item_type: string;
  quantity?: number;
  unit_price: number;
  total: number;
}

export const useBillings = (date?: string) => {
  return useQuery({
    queryKey: ["billings", date],
    queryFn: async () => {
      let query = supabase
        .from("billings")
        .select(`
          *,
          patients (id, hn, first_name, last_name, phone, id_card),
          billing_items (*)
        `)
        .order("billing_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (date) {
        query = query.eq("billing_date", date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Billing[];
    },
  });
};

export const useTodayBillings = () => {
  const today = new Date().toISOString().split("T")[0];
  return useBillings(today);
};

export const useBillingStats = () => {
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["billings", "stats", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billings")
        .select("total, payment_status")
        .eq("billing_date", today);

      if (error) throw error;

      const todayInvoices = data || [];
      const paidTotal = todayInvoices
        .filter((b) => b.payment_status === "paid")
        .reduce((sum, b) => sum + (b.total || 0), 0);
      const pendingTotal = todayInvoices
        .filter((b) => b.payment_status === "pending")
        .reduce((sum, b) => sum + (b.total || 0), 0);

      return {
        totalRevenue: paidTotal,
        pendingAmount: pendingTotal,
        invoiceCount: todayInvoices.length,
      };
    },
  });
};

export const useCreateBilling = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      billing,
      items,
    }: {
      billing: BillingInput;
      items: Omit<BillingItemInput, "billing_id">[];
    }) => {
      // Generate invoice number via RPC
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc(
        "generate_invoice_number"
      );

      if (rpcError) throw rpcError;

      // Insert billing
      const { data: billingData, error: billingError } = await supabase
        .from("billings")
        .insert({
          ...billing,
          invoice_number: invoiceNumber,
          created_by: user?.id,
        })
        .select()
        .single();

      if (billingError) throw billingError;

      // Insert billing items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("billing_items")
          .insert(
            items.map((item) => ({
              ...item,
              billing_id: billingData.id,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return billingData as Billing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      toast({
        title: "สร้างใบเสร็จสำเร็จ",
        description: "สร้างใบเสร็จใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error creating billing:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างใบเสร็จได้",
      });
    },
  });
};

export const useUpdateBillingStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      payment_status,
      payment_method,
      paid_amount,
    }: {
      id: string;
      payment_status: string;
      payment_method?: string;
      paid_amount?: number;
    }) => {
      const updateData: Record<string, unknown> = { payment_status };
      if (payment_method) updateData.payment_method = payment_method;
      if (paid_amount !== undefined) updateData.paid_amount = paid_amount;
      if (payment_status === "paid") updateData.paid_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("billings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Billing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      toast({
        title: "อัปเดตสถานะสำเร็จ",
        description: "อัปเดตสถานะการชำระเงินเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error updating billing status:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
      });
    },
  });
};
