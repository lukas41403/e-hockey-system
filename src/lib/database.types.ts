
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "account_holder_name": string,"cancellation_hours": number,"city": string,"country": Database["public"]['Enums']["country_code"],"created_at": string,"created_by": string | null,"currency": Database["public"]['Enums']["currency_code"],"default_duration_minutes": number,"default_goalie_fee_cents": number,"default_goalie_slots": number,"default_ice_cost_cents": number,"default_price_per_skater_cents": number | null,"default_pricing_mode": Database["public"]['Enums']["pricing_mode"],"default_skater_capacity": number,"default_venue": string,"iban": string,"id": string,"invite_code": string,"name": string,"rounding_step_cents": number,"slug": string,"updated_at": string,"whatsapp_invite_url": string | null
                  }
                  Insert: {
                    "account_holder_name": string,"cancellation_hours"?: number,"city": string,"country": Database["public"]['Enums']["country_code"],"created_at"?: string,"created_by"?: string | null,"currency": Database["public"]['Enums']["currency_code"],"default_duration_minutes"?: number,"default_goalie_fee_cents"?: number,"default_goalie_slots"?: number,"default_ice_cost_cents"?: number,"default_price_per_skater_cents"?: number | null,"default_pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"default_skater_capacity"?: number,"default_venue"?: string,"iban": string,"id"?: string,"invite_code": string,"name": string,"rounding_step_cents": number,"slug": string,"updated_at"?: string,"whatsapp_invite_url"?: string | null
                  }
                  Update: {
                    "account_holder_name"?: string,"cancellation_hours"?: number,"city"?: string,"country"?: Database["public"]['Enums']["country_code"],"created_at"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"default_duration_minutes"?: number,"default_goalie_fee_cents"?: number,"default_goalie_slots"?: number,"default_ice_cost_cents"?: number,"default_price_per_skater_cents"?: number | null,"default_pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"default_skater_capacity"?: number,"default_venue"?: string,"iban"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"rounding_step_cents"?: number,"slug"?: string,"updated_at"?: string,"whatsapp_invite_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ledger_entries": {
                  Row: {
                    "amount_cents": number,"created_at": string,"created_by": string | null,"group_id": string,"id": string,"note": string | null,"payment_id": string | null,"registration_id": string | null,"reverses_entry_id": string | null,"session_id": string | null,"type": Database["public"]['Enums']["ledger_entry_type"],"user_id": string
                  }
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"created_by"?: string | null,"group_id": string,"id"?: string,"note"?: string | null,"payment_id"?: string | null,"registration_id"?: string | null,"reverses_entry_id"?: string | null,"session_id"?: string | null,"type": Database["public"]['Enums']["ledger_entry_type"],"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"created_by"?: string | null,"group_id"?: string,"id"?: string,"note"?: string | null,"payment_id"?: string | null,"registration_id"?: string | null,"reverses_entry_id"?: string | null,"session_id"?: string | null,"type"?: Database["public"]['Enums']["ledger_entry_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "ledger_entries_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_reverses_entry_id_fkey"
      columns: ["reverses_entry_id"]
isOneToOne: false
      referencedRelation: "ledger_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_reverses_entry_id_fkey"
      columns: ["reverses_entry_id"]
isOneToOne: false
      referencedRelation: "ledger_entries_classified"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"open_spot_posts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deactivated_at": string | null,"id": string,"is_active": boolean,"note": string | null,"offer_goalies": boolean,"offer_skaters": boolean,"require_approval": boolean,"session_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"id"?: string,"is_active"?: boolean,"note"?: string | null,"offer_goalies": boolean,"offer_skaters": boolean,"require_approval"?: boolean,"session_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"id"?: string,"is_active"?: boolean,"note"?: string | null,"offer_goalies"?: boolean,"offer_skaters"?: boolean,"require_approval"?: boolean,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "open_spot_posts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "open_spot_posts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "open_spot_posts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"cancelled_at": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"created_by": string | null,"currency": Database["public"]['Enums']["currency_code"],"direction": Database["public"]['Enums']["payment_direction"],"group_id": string,"id": string,"message": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"rejected_at": string | null,"reported_at": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string,"user_id": string,"variable_symbol": number
                  }
                  Insert: {
                    "amount_cents": number,"cancelled_at"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency": Database["public"]['Enums']["currency_code"],"direction": Database["public"]['Enums']["payment_direction"],"group_id": string,"id"?: string,"message"?: string,"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"rejected_at"?: string | null,"reported_at"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string,"user_id": string,"variable_symbol"?: number
                  }
                  Update: {
                    "amount_cents"?: number,"cancelled_at"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"direction"?: Database["public"]['Enums']["payment_direction"],"group_id"?: string,"id"?: string,"message"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"rejected_at"?: string | null,"reported_at"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string,"user_id"?: string,"variable_symbol"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "payments_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "iban": string | null,"phone_e164": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "iban"?: string | null,"phone_e164"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "iban"?: string | null,"phone_e164"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"is_superadmin": boolean,"jersey_number": number | null,"nickname": string | null,"onboarded_at": string | null,"preferred_role": Database["public"]['Enums']["player_role"],"updated_at": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"is_superadmin"?: boolean,"jersey_number"?: number | null,"nickname"?: string | null,"onboarded_at"?: string | null,"preferred_role"?: Database["public"]['Enums']["player_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"is_superadmin"?: boolean,"jersey_number"?: number | null,"nickname"?: string | null,"onboarded_at"?: string | null,"preferred_role"?: Database["public"]['Enums']["player_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"registrations": {
                  Row: {
                    "attended": boolean | null,"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at": string | null,"created_at": string,"created_by": string | null,"group_id": string,"id": string,"is_guest": boolean,"promoted_at": string | null,"promotion_seen_at": string | null,"role": Database["public"]['Enums']["player_role"],"seq": number,"session_id": string,"status": Database["public"]['Enums']["registration_status"],"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "attended"?: boolean | null,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id": string,"id"?: string,"is_guest"?: boolean,"promoted_at"?: string | null,"promotion_seen_at"?: string | null,"role": Database["public"]['Enums']["player_role"],"seq"?: never,"session_id": string,"status": Database["public"]['Enums']["registration_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attended"?: boolean | null,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string,"id"?: string,"is_guest"?: boolean,"promoted_at"?: string | null,"promotion_seen_at"?: string | null,"role"?: Database["public"]['Enums']["player_role"],"seq"?: never,"session_id"?: string,"status"?: Database["public"]['Enums']["registration_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "registrations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_session_fk"
      columns: ["session_id","group_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["session_id","group_id"]
    },{
      foreignKeyName: "registrations_session_fk"
      columns: ["session_id","group_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id","group_id"]
    },{
      foreignKeyName: "registrations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "cancellation_hours": number,"cancelled_at": string | null,"cancelled_by": string | null,"created_at": string,"created_by": string | null,"ends_at": string,"final_price_per_skater_cents": number | null,"finalized_at": string | null,"finalized_by": string | null,"goalie_fee_cents": number,"goalie_slots": number,"group_id": string,"ice_cost_cents": number,"id": string,"notes": string | null,"price_per_skater_cents": number | null,"pricing_mode": Database["public"]['Enums']["pricing_mode"],"rounding_step_cents": number,"series_id": string | null,"skater_capacity": number,"starts_at": string,"status": Database["public"]['Enums']["session_status"],"updated_at": string,"venue": string
                  }
                  Insert: {
                    "cancellation_hours": number,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at": string,"final_price_per_skater_cents"?: number | null,"finalized_at"?: string | null,"finalized_by"?: string | null,"goalie_fee_cents": number,"goalie_slots": number,"group_id": string,"ice_cost_cents": number,"id"?: string,"notes"?: string | null,"price_per_skater_cents"?: number | null,"pricing_mode": Database["public"]['Enums']["pricing_mode"],"rounding_step_cents": number,"series_id"?: string | null,"skater_capacity": number,"starts_at": string,"status"?: Database["public"]['Enums']["session_status"],"updated_at"?: string,"venue": string
                  }
                  Update: {
                    "cancellation_hours"?: number,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string,"final_price_per_skater_cents"?: number | null,"finalized_at"?: string | null,"finalized_by"?: string | null,"goalie_fee_cents"?: number,"goalie_slots"?: number,"group_id"?: string,"ice_cost_cents"?: number,"id"?: string,"notes"?: string | null,"price_per_skater_cents"?: number | null,"pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"rounding_step_cents"?: number,"series_id"?: string | null,"skater_capacity"?: number,"starts_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"updated_at"?: string,"venue"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_finalized_by_fkey"
      columns: ["finalized_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "group_finance_summary": {
                  Row: {
                    "adjustments_cents": number | null,"balances_total_cents": number | null,"cash_available_cents": number | null,"collected_cents": number | null,"credits_cents": number | null,"currency": Database["public"]['Enums']["currency_code"] | null,"debts_cents": number | null,"group_id": string | null,"ice_total_cents": number | null,"paid_out_cents": number | null,"reported_payments_count": number | null,"sessions_result_cents": number | null
                  }
                  Relationships: [
                    
                  ]
                },"ledger_entries_classified": {
                  Row: {
                    "amount_cents": number | null,"created_at": string | null,"created_by": string | null,"group_id": string | null,"id": string | null,"note": string | null,"origin_type": Database["public"]['Enums']["ledger_entry_type"] | null,"payment_id": string | null,"registration_id": string | null,"reverses_entry_id": string | null,"session_id": string | null,"type": Database["public"]['Enums']["ledger_entry_type"] | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "ledger_entries_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_reverses_entry_id_fkey"
      columns: ["reverses_entry_id"]
isOneToOne: false
      referencedRelation: "ledger_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_reverses_entry_id_fkey"
      columns: ["reverses_entry_id"]
isOneToOne: false
      referencedRelation: "ledger_entries_classified"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"member_balances": {
                  Row: {
                    "balance_cents": number | null,"group_id": string | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"member_finance": {
                  Row: {
                    "adjustments_cents": number | null,"balance_cents": number | null,"charged_cents": number | null,"goalie_earned_cents": number | null,"goalie_paid_out_cents": number | null,"group_id": string | null,"paid_cents": number | null,"role": Database["public"]['Enums']["member_role"] | null,"sessions_count": number | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"session_summaries": {
                  Row: {
                    "attended_goalies": number | null,"attended_skaters": number | null,"charged_cents": number | null,"confirmed_goalies": number | null,"confirmed_skaters": number | null,"goalie_earnings_cents": number | null,"group_id": string | null,"ice_cost_cents": number | null,"late_cancelled_skaters": number | null,"pending_count": number | null,"result_cents": number | null,"session_id": string | null,"starts_at": string | null,"status": Database["public"]['Enums']["session_status"] | null,"waitlist_goalies": number | null,"waitlist_skaters": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "group_finance_summary"
      referencedColumns: ["group_id"]
    },{
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_adjustment":
{ Args: { "p_amount_cents": number,"p_group_id": string,"p_note": string,"p_user_id": string }; Returns: {
              "amount_cents": number,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"note": string | null,
"payment_id": string | null,
"registration_id": string | null,
"reverses_entry_id": string | null,
"session_id": string | null,
"type": Database["public"]['Enums']["ledger_entry_type"],
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "ledger_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_list_groups":
{ Args: Record<PropertyKey, never>; Returns: {
              "city": string,"country": Database["public"]['Enums']["country_code"],"created_at": string,"group_id": string,"member_count": number,"name": string,"session_count": number
            }[]
                           },
"approve_registration":
{ Args: { "p_registration_id": string }; Returns: {
              "attended": boolean | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,
"cancelled_at": string | null,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"is_guest": boolean,
"promoted_at": string | null,
"promotion_seen_at": string | null,
"role": Database["public"]['Enums']["player_role"],
"seq": number,
"session_id": string,
"status": Database["public"]['Enums']["registration_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_registration":
{ Args: { "p_registration_id": string }; Returns: {
              "attended": boolean | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,
"cancelled_at": string | null,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"is_guest": boolean,
"promoted_at": string | null,
"promotion_seen_at": string | null,
"role": Database["public"]['Enums']["player_role"],
"seq": number,
"session_id": string,
"status": Database["public"]['Enums']["registration_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_session":
{ Args: { "p_session_id": string }; Returns: {
              "cancellation_hours": number,
"cancelled_at": string | null,
"cancelled_by": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string,
"final_price_per_skater_cents": number | null,
"finalized_at": string | null,
"finalized_by": string | null,
"goalie_fee_cents": number,
"goalie_slots": number,
"group_id": string,
"ice_cost_cents": number,
"id": string,
"notes": string | null,
"price_per_skater_cents": number | null,
"pricing_mode": Database["public"]['Enums']["pricing_mode"],
"rounding_step_cents": number,
"series_id": string | null,
"skater_capacity": number,
"starts_at": string,
"status": Database["public"]['Enums']["session_status"],
"updated_at": string,
"venue": string
            }
                          SetofOptions: {
        from: "*"
        to: "sessions"
        isOneToOne: true
        isSetofReturn: false
      } },
"confirm_goalie_payout":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"confirm_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_goalie_payout":
{ Args: { "p_amount_cents": number,"p_group_id": string,"p_method"?: Database["public"]['Enums']["payment_method"],"p_user_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_group":
{ Args: { "p_account_holder_name": string,"p_cancellation_hours"?: number,"p_city": string,"p_country": Database["public"]['Enums']["country_code"],"p_default_duration_minutes"?: number,"p_default_goalie_fee_cents"?: number,"p_default_goalie_slots"?: number,"p_default_ice_cost_cents"?: number,"p_default_price_per_skater_cents"?: number,"p_default_pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"p_default_skater_capacity"?: number,"p_default_venue"?: string,"p_iban": string,"p_name": string,"p_rounding_step_cents"?: number,"p_whatsapp_invite_url"?: string }; Returns: {
              "account_holder_name": string,
"cancellation_hours": number,
"city": string,
"country": Database["public"]['Enums']["country_code"],
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"default_duration_minutes": number,
"default_goalie_fee_cents": number,
"default_goalie_slots": number,
"default_ice_cost_cents": number,
"default_price_per_skater_cents": number | null,
"default_pricing_mode": Database["public"]['Enums']["pricing_mode"],
"default_skater_capacity": number,
"default_venue": string,
"iban": string,
"id": string,
"invite_code": string,
"name": string,
"rounding_step_cents": number,
"slug": string,
"updated_at": string,
"whatsapp_invite_url": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "groups"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_payment_request":
{ Args: { "p_amount_cents": number,"p_group_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_sessions":
{ Args: { "p_cancellation_hours"?: number,"p_duration_minutes"?: number,"p_goalie_fee_cents"?: number,"p_goalie_slots"?: number,"p_group_id": string,"p_ice_cost_cents"?: number,"p_notes"?: string,"p_price_per_skater_cents"?: number,"p_pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"p_repeat_weeks"?: number,"p_rounding_step_cents"?: number,"p_skater_capacity"?: number,"p_starts_at": string,"p_venue"?: string }; Returns: {
              "cancellation_hours": number,
"cancelled_at": string | null,
"cancelled_by": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string,
"final_price_per_skater_cents": number | null,
"finalized_at": string | null,
"finalized_by": string | null,
"goalie_fee_cents": number,
"goalie_slots": number,
"group_id": string,
"ice_cost_cents": number,
"id": string,
"notes": string | null,
"price_per_skater_cents": number | null,
"pricing_mode": Database["public"]['Enums']["pricing_mode"],
"rounding_step_cents": number,
"series_id": string | null,
"skater_capacity": number,
"starts_at": string,
"status": Database["public"]['Enums']["session_status"],
"updated_at": string,
"venue": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "sessions"
        isOneToOne: false
        isSetofReturn: true
      } },
"finalize_session":
{ Args: { "p_attendance": Json,"p_session_id": string }; Returns: {
              "cancellation_hours": number,
"cancelled_at": string | null,
"cancelled_by": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string,
"final_price_per_skater_cents": number | null,
"finalized_at": string | null,
"finalized_by": string | null,
"goalie_fee_cents": number,
"goalie_slots": number,
"group_id": string,
"ice_cost_cents": number,
"id": string,
"notes": string | null,
"price_per_skater_cents": number | null,
"pricing_mode": Database["public"]['Enums']["pricing_mode"],
"rounding_step_cents": number,
"series_id": string | null,
"skater_capacity": number,
"starts_at": string,
"status": Database["public"]['Enums']["session_status"],
"updated_at": string,
"venue": string
            }
                          SetofOptions: {
        from: "*"
        to: "sessions"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_group_admin_contacts":
{ Args: { "p_group_id": string }; Returns: {
              "full_name": string,"nickname": string,"phone_e164": string,"user_id": string
            }[]
                           },
"get_invite_preview":
{ Args: { "p_invite_code": string }; Returns: {
              "city": string,"group_id": string,"is_member": boolean,"member_count": number,"name": string
            }[]
                           },
"get_public_post":
{ Args: { "p_post_id": string }; Returns: {
              "city": string,"currency": Database["public"]['Enums']["currency_code"],"ends_at": string,"estimated_full_price_cents": number,"estimated_price_cents": number,"free_goalie_spots": number,"free_skater_spots": number,"goalie_fee_cents": number,"group_name": string,"is_available": boolean,"note": string,"offer_goalies": boolean,"offer_skaters": boolean,"post_id": string,"price_per_skater_cents": number,"pricing_mode": Database["public"]['Enums']["pricing_mode"],"require_approval": boolean,"session_id": string,"starts_at": string,"venue": string
            }[]
                           },
"join_group":
{ Args: { "p_invite_code": string }; Returns: string
                           },
"list_open_spot_cities":
{ Args: Record<PropertyKey, never>; Returns: {
              "city": string
            }[]
                           },
"list_open_spots":
{ Args: { "p_city"?: string,"p_date_from"?: string,"p_date_to"?: string,"p_role"?: Database["public"]['Enums']["player_role"] }; Returns: {
              "city": string,"currency": Database["public"]['Enums']["currency_code"],"ends_at": string,"estimated_full_price_cents": number,"estimated_price_cents": number,"free_goalie_spots": number,"free_skater_spots": number,"goalie_fee_cents": number,"goalie_slots": number,"group_id": string,"group_name": string,"is_member": boolean,"my_registration_status": Database["public"]['Enums']["registration_status"],"note": string,"offer_goalies": boolean,"offer_skaters": boolean,"post_id": string,"price_per_skater_cents": number,"pricing_mode": Database["public"]['Enums']["pricing_mode"],"require_approval": boolean,"session_id": string,"skater_capacity": number,"starts_at": string,"venue": string
            }[]
                           },
"mark_promotion_seen":
{ Args: { "p_registration_id": string }; Returns: undefined
                           },
"publish_open_spots":
{ Args: { "p_note"?: string,"p_offer_goalies": boolean,"p_offer_skaters": boolean,"p_require_approval"?: boolean,"p_session_id": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"deactivated_at": string | null,
"id": string,
"is_active": boolean,
"note": string | null,
"offer_goalies": boolean,
"offer_skaters": boolean,
"require_approval": boolean,
"session_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "open_spot_posts"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_cash_payment":
{ Args: { "p_amount_cents": number,"p_group_id": string,"p_note"?: string,"p_user_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"regenerate_invite_code":
{ Args: { "p_group_id": string }; Returns: string
                           },
"register_for_session":
{ Args: { "p_role": Database["public"]['Enums']["player_role"],"p_session_id": string,"p_user_id"?: string }; Returns: {
              "attended": boolean | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,
"cancelled_at": string | null,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"is_guest": boolean,
"promoted_at": string | null,
"promotion_seen_at": string | null,
"role": Database["public"]['Enums']["player_role"],
"seq": number,
"session_id": string,
"status": Database["public"]['Enums']["registration_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_registration":
{ Args: { "p_registration_id": string }; Returns: {
              "attended": boolean | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,
"cancelled_at": string | null,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"is_guest": boolean,
"promoted_at": string | null,
"promotion_seen_at": string | null,
"role": Database["public"]['Enums']["player_role"],
"seq": number,
"session_id": string,
"status": Database["public"]['Enums']["registration_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"remove_member":
{ Args: { "p_group_id": string,"p_user_id": string }; Returns: undefined
                           },
"remove_registration":
{ Args: { "p_registration_id": string }; Returns: {
              "attended": boolean | null,
"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,
"cancelled_at": string | null,
"created_at": string,
"created_by": string | null,
"group_id": string,
"id": string,
"is_guest": boolean,
"promoted_at": string | null,
"promotion_seen_at": string | null,
"role": Database["public"]['Enums']["player_role"],
"seq": number,
"session_id": string,
"status": Database["public"]['Enums']["registration_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"reopen_session":
{ Args: { "p_session_id": string }; Returns: {
              "cancellation_hours": number,
"cancelled_at": string | null,
"cancelled_by": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string,
"final_price_per_skater_cents": number | null,
"finalized_at": string | null,
"finalized_by": string | null,
"goalie_fee_cents": number,
"goalie_slots": number,
"group_id": string,
"ice_cost_cents": number,
"id": string,
"notes": string | null,
"price_per_skater_cents": number | null,
"pricing_mode": Database["public"]['Enums']["pricing_mode"],
"rounding_step_cents": number,
"series_id": string | null,
"skater_capacity": number,
"starts_at": string,
"status": Database["public"]['Enums']["session_status"],
"updated_at": string,
"venue": string
            }
                          SetofOptions: {
        from: "*"
        to: "sessions"
        isOneToOne: true
        isSetofReturn: false
      } },
"report_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_cents": number,
"cancelled_at": string | null,
"confirmed_at": string | null,
"confirmed_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"direction": Database["public"]['Enums']["payment_direction"],
"group_id": string,
"id": string,
"message": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"rejected_at": string | null,
"reported_at": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string,
"user_id": string,
"variable_symbol": number
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_member_role":
{ Args: { "p_group_id": string,"p_role": Database["public"]['Enums']["member_role"],"p_user_id": string }; Returns: undefined
                           },
"unpublish_open_spots":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"update_group_settings":
{ Args: { "p_account_holder_name": string,"p_cancellation_hours": number,"p_city": string,"p_country": Database["public"]['Enums']["country_code"],"p_default_duration_minutes": number,"p_default_goalie_fee_cents": number,"p_default_goalie_slots": number,"p_default_ice_cost_cents": number,"p_default_price_per_skater_cents": number,"p_default_pricing_mode": Database["public"]['Enums']["pricing_mode"],"p_default_skater_capacity": number,"p_default_venue": string,"p_group_id": string,"p_iban": string,"p_name": string,"p_rounding_step_cents": number,"p_whatsapp_invite_url": string }; Returns: {
              "account_holder_name": string,
"cancellation_hours": number,
"city": string,
"country": Database["public"]['Enums']["country_code"],
"created_at": string,
"created_by": string | null,
"currency": Database["public"]['Enums']["currency_code"],
"default_duration_minutes": number,
"default_goalie_fee_cents": number,
"default_goalie_slots": number,
"default_ice_cost_cents": number,
"default_price_per_skater_cents": number | null,
"default_pricing_mode": Database["public"]['Enums']["pricing_mode"],
"default_skater_capacity": number,
"default_venue": string,
"iban": string,
"id": string,
"invite_code": string,
"name": string,
"rounding_step_cents": number,
"slug": string,
"updated_at": string,
"whatsapp_invite_url": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "groups"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_my_profile":
{ Args: { "p_full_name": string,"p_iban"?: string,"p_jersey_number"?: number,"p_nickname"?: string,"p_phone_e164"?: string,"p_preferred_role"?: Database["public"]['Enums']["player_role"] }; Returns: {
              "avatar_url": string | null,
"created_at": string,
"full_name": string,
"id": string,
"is_superadmin": boolean,
"jersey_number": number | null,
"nickname": string | null,
"onboarded_at": string | null,
"preferred_role": Database["public"]['Enums']["player_role"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_session":
{ Args: { "p_cancellation_hours": number,"p_duration_minutes": number,"p_goalie_fee_cents": number,"p_goalie_slots": number,"p_ice_cost_cents": number,"p_notes": string,"p_price_per_skater_cents": number,"p_pricing_mode": Database["public"]['Enums']["pricing_mode"],"p_rounding_step_cents": number,"p_session_id": string,"p_skater_capacity": number,"p_starts_at": string,"p_venue": string }; Returns: {
              "cancellation_hours": number,
"cancelled_at": string | null,
"cancelled_by": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string,
"final_price_per_skater_cents": number | null,
"finalized_at": string | null,
"finalized_by": string | null,
"goalie_fee_cents": number,
"goalie_slots": number,
"group_id": string,
"ice_cost_cents": number,
"id": string,
"notes": string | null,
"price_per_skater_cents": number | null,
"pricing_mode": Database["public"]['Enums']["pricing_mode"],
"rounding_step_cents": number,
"series_id": string | null,
"skater_capacity": number,
"starts_at": string,
"status": Database["public"]['Enums']["session_status"],
"updated_at": string,
"venue": string
            }
                          SetofOptions: {
        from: "*"
        to: "sessions"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "cancel_reason": "self"|"replaced"|"late_released"|"removed"|"rejected"|"session_cancelled"|"member_removed","country_code": "SK"|"CZ","currency_code": "EUR"|"CZK","ledger_entry_type": "topup"|"charge"|"goalie_earning"|"goalie_payout"|"reversal"|"adjustment","member_role": "admin"|"member"|"guest","payment_direction": "incoming"|"outgoing","payment_method": "transfer"|"cash","payment_status": "pending"|"reported"|"confirmed"|"rejected"|"cancelled","player_role": "skater"|"goalie","pricing_mode": "fixed"|"dynamic","registration_status": "pending"|"confirmed"|"waitlist"|"cancelled"|"late_cancelled","session_status": "scheduled"|"completed"|"cancelled"
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
  "public": {
          Enums: {
            "cancel_reason": ["self", "replaced", "late_released", "removed", "rejected", "session_cancelled", "member_removed"],"country_code": ["SK", "CZ"],"currency_code": ["EUR", "CZK"],"ledger_entry_type": ["topup", "charge", "goalie_earning", "goalie_payout", "reversal", "adjustment"],"member_role": ["admin", "member", "guest"],"payment_direction": ["incoming", "outgoing"],"payment_method": ["transfer", "cash"],"payment_status": ["pending", "reported", "confirmed", "rejected", "cancelled"],"player_role": ["skater", "goalie"],"pricing_mode": ["fixed", "dynamic"],"registration_status": ["pending", "confirmed", "waitlist", "cancelled", "late_cancelled"],"session_status": ["scheduled", "completed", "cancelled"]
          }
        }
} as const

