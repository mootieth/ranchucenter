export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          end_time: string | null
          google_event_id: string | null
          google_meet_event_id: string | null
          id: string
          location_id: string | null
          meet_link: string | null
          notes: string | null
          patient_id: string
          provider_id: string | null
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          google_event_id?: string | null
          google_meet_event_id?: string | null
          id?: string
          location_id?: string | null
          meet_link?: string | null
          notes?: string | null
          patient_id: string
          provider_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          google_event_id?: string | null
          google_meet_event_id?: string | null
          id?: string
          location_id?: string | null
          meet_link?: string | null
          notes?: string | null
          patient_id?: string
          provider_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_items: {
        Row: {
          billing_id: string
          created_at: string
          description: string
          id: string
          item_type: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          billing_id: string
          created_at?: string
          description: string
          id?: string
          item_type: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          billing_id?: string
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_items_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billings"
            referencedColumns: ["id"]
          },
        ]
      }
      billings: {
        Row: {
          appointment_id: string | null
          billing_date: string
          created_at: string
          created_by: string | null
          discount: number | null
          id: string
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          subtotal: number
          tax: number | null
          total: number
          treatment_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          billing_date?: string
          created_at?: string
          created_by?: string | null
          discount?: number | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          treatment_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          billing_date?: string
          created_at?: string
          created_by?: string | null
          discount?: number | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          treatment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billings_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      medications: {
        Row: {
          category: string | null
          contraindications: string | null
          cost_price: number | null
          created_at: string
          dosage_form: string | null
          expiry_date: string | null
          generic_name: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          min_stock: number | null
          name: string
          price: number | null
          side_effects: string | null
          stock_quantity: number | null
          strength: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          contraindications?: string | null
          cost_price?: number | null
          created_at?: string
          dosage_form?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          price?: number | null
          side_effects?: string | null
          stock_quantity?: number | null
          strength?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          contraindications?: string | null
          cost_price?: number | null
          created_at?: string
          dosage_form?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          price?: number | null
          side_effects?: string | null
          stock_quantity?: number | null
          strength?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_allergies: {
        Row: {
          allergen: string
          allergen_type: string | null
          created_at: string
          first_occurrence: string | null
          id: string
          notes: string | null
          patient_id: string
          reaction: string | null
          reported_by: string | null
          severity: string | null
          updated_at: string
        }
        Insert: {
          allergen: string
          allergen_type?: string | null
          created_at?: string
          first_occurrence?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reaction?: string | null
          reported_by?: string | null
          severity?: string | null
          updated_at?: string
        }
        Update: {
          allergen?: string
          allergen_type?: string | null
          created_at?: string
          first_occurrence?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reaction?: string | null
          reported_by?: string | null
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_providers: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          provider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_providers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          blood_type: string | null
          created_at: string
          created_by: string | null
          current_address: string | null
          date_of_birth: string | null
          district: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          first_name: string
          gender: string | null
          hn: string
          house_number: string | null
          id: string
          id_card: string | null
          last_name: string
          marital_status: string | null
          moo: string | null
          nickname: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          prefix: string | null
          province: string | null
          status: string | null
          street: string | null
          subdistrict: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name: string
          gender?: string | null
          hn: string
          house_number?: string | null
          id?: string
          id_card?: string | null
          last_name: string
          marital_status?: string | null
          moo?: string | null
          nickname?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          prefix?: string | null
          province?: string | null
          status?: string | null
          street?: string | null
          subdistrict?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name?: string
          gender?: string | null
          hn?: string
          house_number?: string | null
          id?: string
          id_card?: string | null
          last_name?: string
          marital_status?: string | null
          moo?: string | null
          nickname?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          prefix?: string | null
          province?: string | null
          status?: string | null
          street?: string | null
          subdistrict?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string | null
          frequency: string
          id: string
          instructions: string | null
          medication_id: string | null
          medication_name: string
          prescription_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          dosage: string
          duration?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name: string
          prescription_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          prescription_date: string
          provider_id: string | null
          status: string | null
          treatment_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription_date?: string
          provider_id?: string | null
          status?: string | null
          treatment_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_date?: string
          provider_id?: string | null
          status?: string | null
          treatment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          deactivation_reason: string | null
          district: string | null
          full_name: string
          house_number: string | null
          id: string
          id_card: string | null
          is_active: boolean
          license_number: string | null
          moo: string | null
          nickname: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          resignation_date: string | null
          salary: number | null
          specialty: string | null
          street: string | null
          subdistrict: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deactivation_reason?: string | null
          district?: string | null
          full_name: string
          house_number?: string | null
          id?: string
          id_card?: string | null
          is_active?: boolean
          license_number?: string | null
          moo?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          resignation_date?: string | null
          salary?: number | null
          specialty?: string | null
          street?: string | null
          subdistrict?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deactivation_reason?: string | null
          district?: string | null
          full_name?: string
          house_number?: string | null
          id?: string
          id_card?: string | null
          is_active?: boolean
          license_number?: string | null
          moo?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          resignation_date?: string | null
          salary?: number | null
          specialty?: string | null
          street?: string | null
          subdistrict?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_google_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          provider_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          provider_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          price: number
          service_mode: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          service_mode?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          service_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          medication_id: string
          movement_type: string
          new_stock: number
          notes: string | null
          previous_stock: number
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id: string
          movement_type: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      thailand_addresses: {
        Row: {
          created_at: string
          district: string
          id: string
          postal_code: string
          province: string
          subdistrict: string
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          postal_code: string
          province: string
          subdistrict: string
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          postal_code?: string
          province?: string
          subdistrict?: string
        }
        Relationships: []
      }
      treatment_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          patient_id: string
          treatment_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          patient_id: string
          treatment_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          patient_id?: string
          treatment_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_files_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          appointment_id: string | null
          clinical_notes: string | null
          created_at: string
          diagnosis: string | null
          diagnosis_code: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          patient_id: string
          procedures: string | null
          provider_id: string | null
          symptoms: string | null
          treatment_date: string
          treatment_plan: string | null
          updated_at: string
          vital_signs: Json | null
        }
        Insert: {
          appointment_id?: string | null
          clinical_notes?: string | null
          created_at?: string
          diagnosis?: string | null
          diagnosis_code?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          patient_id: string
          procedures?: string | null
          provider_id?: string | null
          symptoms?: string | null
          treatment_date?: string
          treatment_plan?: string | null
          updated_at?: string
          vital_signs?: Json | null
        }
        Update: {
          appointment_id?: string | null
          clinical_notes?: string | null
          created_at?: string
          diagnosis?: string | null
          diagnosis_code?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          patient_id?: string
          procedures?: string | null
          provider_id?: string | null
          symptoms?: string | null
          treatment_date?: string
          treatment_plan?: string | null
          updated_at?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_patient_cascade: {
        Args: { _patient_id: string }
        Returns: undefined
      }
      delete_treatment_cascade: {
        Args: { _treatment_id: string }
        Returns: undefined
      }
      generate_hn: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "therapist" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "doctor", "therapist", "staff"],
    },
  },
} as const
