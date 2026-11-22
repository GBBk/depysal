
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attendances": {
                  Row: {
                    "client_id": string,"created_at": string,"created_by": string | null,"fecha": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"created_by"?: string | null,"fecha": string,"id"?: never
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"created_by"?: string | null,"fecha"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendances_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_status"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "attendances_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "client_status"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "attendances_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "created_at": string,"equipo": string,"grupo_muscular": string,"id": number,"imagenes": (string)[],"instrucciones": string,"nombre": string,"origen": string,"origen_id": string | null,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"equipo": string,"grupo_muscular": string,"id"?: never,"imagenes"?: (string)[],"instrucciones"?: string,"nombre": string,"origen"?: string,"origen_id"?: string | null,"video_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"equipo"?: string,"grupo_muscular"?: string,"id"?: never,"imagenes"?: (string)[],"instrucciones"?: string,"nombre"?: string,"origen"?: string,"origen_id"?: string | null,"video_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "anulado": boolean,"clases": number | null,"client_id": string,"created_at": string,"fecha_pago": string,"id": number,"medio": string,"monto": number,"plan_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "anulado"?: boolean,"clases"?: number | null,"client_id": string,"created_at"?: string,"fecha_pago": string,"id"?: never,"medio": string,"monto": number,"plan_id": number
                  }
                  Update: {
                    "anulado"?: boolean,"clases"?: number | null,"client_id"?: string,"created_at"?: string,"fecha_pago"?: string,"id"?: never,"medio"?: string,"monto"?: number,"plan_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_status"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "payments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "activo": boolean,"clases": number | null,"id": number,"nombre": string,"precio": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"clases"?: number | null,"id"?: never,"nombre": string,"precio": number
                  }
                  Update: {
                    "activo"?: boolean,"clases"?: number | null,"id"?: never,"nombre"?: string,"precio"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "activo": boolean,"apellido": string,"created_at": string,"dni": string | null,"email": string | null,"id": string,"nombre": string,"notas": string | null,"rol": string,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"apellido"?: string,"created_at"?: string,"dni"?: string | null,"email"?: string | null,"id": string,"nombre"?: string,"notas"?: string | null,"rol"?: string,"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"apellido"?: string,"created_at"?: string,"dni"?: string | null,"email"?: string | null,"id"?: string,"nombre"?: string,"notas"?: string | null,"rol"?: string,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"routine_completions": {
                  Row: {
                    "client_id": string,"created_at": string,"dia": string,"fecha": string,"id": number,"routine_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string,"created_at"?: string,"dia": string,"fecha": string,"id"?: never,"routine_id": number
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"dia"?: string,"fecha"?: string,"id"?: never,"routine_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_completions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_status"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "routine_completions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routine_completions_routine_id_fkey"
      columns: ["routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id"]
    }
                  ]
                },"routine_items": {
                  Row: {
                    "descanso_seg": number | null,"dia": string,"exercise_id": number,"id": number,"notas": string | null,"orden": number,"reps": string,"routine_id": number,"series": number
                  }
                  ComputedFields: never
                  Insert: {
                    "descanso_seg"?: number | null,"dia": string,"exercise_id": number,"id"?: never,"notas"?: string | null,"orden": number,"reps": string,"routine_id": number,"series": number
                  }
                  Update: {
                    "descanso_seg"?: number | null,"dia"?: string,"exercise_id"?: number,"id"?: never,"notas"?: string | null,"orden"?: number,"reps"?: string,"routine_id"?: number,"series"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_items_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routine_items_routine_id_fkey"
      columns: ["routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "activa": boolean,"client_id": string | null,"created_at": string,"es_plantilla": boolean,"id": number,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"client_id"?: string | null,"created_at"?: string,"es_plantilla"?: boolean,"id"?: never,"nombre": string
                  }
                  Update: {
                    "activa"?: boolean,"client_id"?: string | null,"created_at"?: string,"es_plantilla"?: boolean,"id"?: never,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "routines_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "client_status"
      referencedColumns: ["client_id"]
    },{
      foreignKeyName: "routines_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "client_status": {
                  Row: {
                    "clases_restantes": number | null,"client_id": string,"desde": string | null,"estado": string | null,"hasta": string | null,"periodo_actual": number | null,"plan_nombre": string | null,"tiene_periodo_en_espera": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "assign_routine":
{ Args: { "p_client_id": string,"p_nombre"?: string,"p_template_id"?: number }; Returns: number
                           },
"client_periods":
{ Args: { "p_client_id": string }; Returns: {
              "clases_total": number,"clases_usadas": number,"desde": string,"hasta": string,"payment_id": number,"plan_nombre": string,"termino_por_clases": boolean
            }[]
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"save_routine":
{ Args: { "p_items": Json,"p_nombre": string,"p_routine_id": number }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
