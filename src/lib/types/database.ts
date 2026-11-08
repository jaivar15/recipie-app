export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      collection_recipes: {
        Row: {
          added_at: string;
          collection_id: string;
          position: number;
          recipe_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          collection_id: string;
          position?: number;
          recipe_id: string;
        };
        Update: {
          added_at?: string;
          collection_id?: string;
          position?: number;
          recipe_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_recipes_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_recipes_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          household_id: string | null;
          id: string;
          name: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collections_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_activity_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          household_id: string;
          id: string;
          metadata: NonNullable<Json>;
          resource_id: string | null;
          resource_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          metadata?: NonNullable<Json>;
          resource_id?: string | null;
          resource_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          resource_id?: string | null;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_activity_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_activity_logs_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invitations: {
        Row: {
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string;
          responded_at: string | null;
          role: Database["public"]["Enums"]["household_role"];
          status: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          household_id: string;
          id?: string;
          invited_by: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
        };
        Update: {
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invitations_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          id: string;
          invited_by: string | null;
          joined_at: string;
          role: Database["public"]["Enums"]["household_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          household_id: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["household_role"];
          user_id: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["household_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          archived_at: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          image_url: string | null;
          name: string;
          owner_id: string;
          settings: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          owner_id: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          owner_id?: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredient_measurement_conversions: {
        Row: {
          created_at: string;
          grams_per_unit: number;
          id: string;
          ingredient_id: string;
          unit: Database["public"]["Enums"]["measurement_unit"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          grams_per_unit: number;
          id?: string;
          ingredient_id: string;
          unit: Database["public"]["Enums"]["measurement_unit"];
        };
        Update: {
          created_at?: string;
          grams_per_unit?: number;
          id?: string;
          ingredient_id?: string;
          unit?: Database["public"]["Enums"]["measurement_unit"];
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_measurement_conversions_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredient_nutrition: {
        Row: {
          calcium_mg: number | null;
          calories_kcal: number | null;
          carbohydrate_g: number | null;
          energy_kj: number | null;
          fat_g: number | null;
          fibre_g: number | null;
          folate_ug: number | null;
          ingredient_id: string;
          iron_mg: number | null;
          magnesium_mg: number | null;
          potassium_mg: number | null;
          protein_g: number | null;
          saturated_fat_g: number | null;
          sodium_mg: number | null;
          source_detail: string | null;
          source_id: string | null;
          sugars_g: number | null;
          updated_at: string;
          updated_by: string | null;
          vitamin_b12_ug: number | null;
        };
        ComputedFields: never;
        Insert: {
          calcium_mg?: number | null;
          calories_kcal?: number | null;
          carbohydrate_g?: number | null;
          energy_kj?: number | null;
          fat_g?: number | null;
          fibre_g?: number | null;
          folate_ug?: number | null;
          ingredient_id: string;
          iron_mg?: number | null;
          magnesium_mg?: number | null;
          potassium_mg?: number | null;
          protein_g?: number | null;
          saturated_fat_g?: number | null;
          sodium_mg?: number | null;
          source_detail?: string | null;
          source_id?: string | null;
          sugars_g?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          vitamin_b12_ug?: number | null;
        };
        Update: {
          calcium_mg?: number | null;
          calories_kcal?: number | null;
          carbohydrate_g?: number | null;
          energy_kj?: number | null;
          fat_g?: number | null;
          fibre_g?: number | null;
          folate_ug?: number | null;
          ingredient_id?: string;
          iron_mg?: number | null;
          magnesium_mg?: number | null;
          potassium_mg?: number | null;
          protein_g?: number | null;
          saturated_fat_g?: number | null;
          sodium_mg?: number | null;
          source_detail?: string | null;
          source_id?: string | null;
          sugars_g?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          vitamin_b12_ug?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_nutrition_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: true;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingredient_nutrition_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "nutrition_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingredient_nutrition_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          allergens: string[];
          alternative_names: string[];
          brand: string | null;
          created_at: string;
          created_by: string;
          food_category: string | null;
          household_id: string | null;
          id: string;
          name: string;
          notes: string | null;
          state: string | null;
          updated_at: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        ComputedFields: never;
        Insert: {
          allergens?: string[];
          alternative_names?: string[];
          brand?: string | null;
          created_at?: string;
          created_by: string;
          food_category?: string | null;
          household_id?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          state?: string | null;
          updated_at?: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Update: {
          allergens?: string[];
          alternative_names?: string[];
          brand?: string | null;
          created_at?: string;
          created_by?: string;
          food_category?: string | null;
          household_id?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          state?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "ingredients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingredients_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plan_entries: {
        Row: {
          created_at: string;
          created_by: string | null;
          custom_title: string | null;
          entry_date: string;
          id: string;
          meal_plan_id: string;
          meal_type: Database["public"]["Enums"]["meal_type"];
          notes: string | null;
          recipe_id: string | null;
          servings: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          custom_title?: string | null;
          entry_date: string;
          id?: string;
          meal_plan_id: string;
          meal_type: Database["public"]["Enums"]["meal_type"];
          notes?: string | null;
          recipe_id?: string | null;
          servings?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          custom_title?: string | null;
          entry_date?: string;
          id?: string;
          meal_plan_id?: string;
          meal_type?: Database["public"]["Enums"]["meal_type"];
          notes?: string | null;
          recipe_id?: string | null;
          servings?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plan_member_portions: {
        Row: {
          id: string;
          meal_plan_entry_id: string;
          portions: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          meal_plan_entry_id: string;
          portions?: number;
          user_id: string;
        };
        Update: {
          id?: string;
          meal_plan_entry_id?: string;
          portions?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plan_member_portions_meal_plan_entry_id_fkey";
            columns: ["meal_plan_entry_id"];
            isOneToOne: false;
            referencedRelation: "meal_plan_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plan_member_portions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          name: string;
          start_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          name?: string;
          start_date: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          name?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plans_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrition_sources: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          default_household_id: string | null;
          display_name: string;
          email: string;
          id: string;
          measurement_system: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          default_household_id?: string | null;
          display_name: string;
          email: string;
          id: string;
          measurement_system?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          default_household_id?: string | null;
          display_name?: string;
          email?: string;
          id?: string;
          measurement_system?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_household_fk";
            columns: ["default_household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_favourites: {
        Row: {
          created_at: string;
          id: string;
          recipe_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          recipe_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_favourites_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_favourites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_images: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          position: number;
          recipe_id: string;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          position?: number;
          recipe_id: string;
          storage_path: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          position?: number;
          recipe_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_images_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_ingredients: {
        Row: {
          brand: string | null;
          created_at: string;
          id: string;
          ingredient_id: string | null;
          ingredient_name: string;
          nutrition_override: Json | null;
          position: number;
          preparation_note: string | null;
          quantity: number | null;
          recipe_id: string;
          unit: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        ComputedFields: never;
        Insert: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          ingredient_id?: string | null;
          ingredient_name: string;
          nutrition_override?: Json | null;
          position?: number;
          preparation_note?: string | null;
          quantity?: number | null;
          recipe_id: string;
          unit?: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        Update: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          ingredient_id?: string | null;
          ingredient_name?: string;
          nutrition_override?: Json | null;
          position?: number;
          preparation_note?: string | null;
          quantity?: number | null;
          recipe_id?: string;
          unit?: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_personal_notes: {
        Row: {
          created_at: string;
          id: string;
          note: string;
          recipe_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          note: string;
          recipe_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string;
          recipe_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_personal_notes_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_personal_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_steps: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          equipment: string | null;
          id: string;
          image_storage_path: string | null;
          instruction: string;
          position: number;
          recipe_id: string;
          temperature_celsius: number | null;
          tip: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          equipment?: string | null;
          id?: string;
          image_storage_path?: string | null;
          instruction: string;
          position?: number;
          recipe_id: string;
          temperature_celsius?: number | null;
          tip?: string | null;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          equipment?: string | null;
          id?: string;
          image_storage_path?: string | null;
          instruction?: string;
          position?: number;
          recipe_id?: string;
          temperature_celsius?: number | null;
          tip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_tags: {
        Row: {
          recipe_id: string;
          tag_id: string;
        };
        ComputedFields: never;
        Insert: {
          recipe_id: string;
          tag_id: string;
        };
        Update: {
          recipe_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_versions: {
        Row: {
          created_at: string;
          edited_by: string | null;
          id: string;
          recipe_id: string;
          snapshot: NonNullable<Json>;
          version_number: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          edited_by?: string | null;
          id?: string;
          recipe_id: string;
          snapshot: NonNullable<Json>;
          version_number: number;
        };
        Update: {
          created_at?: string;
          edited_by?: string | null;
          id?: string;
          recipe_id?: string;
          snapshot?: NonNullable<Json>;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_versions_edited_by_fkey";
            columns: ["edited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          author_name: string | null;
          cook_time_minutes: number | null;
          cooking_method: string | null;
          created_at: string;
          created_by: string;
          cuisine: string | null;
          deleted_at: string | null;
          description: string | null;
          dietary_labels: string[];
          dietary_labels_verified: string[];
          difficulty: Database["public"]["Enums"]["recipe_difficulty"] | null;
          equipment: string[];
          finished_weight_grams: number | null;
          household_id: string | null;
          id: string;
          last_edited_by: string | null;
          meal_type: string[];
          original_author_id: string | null;
          prep_time_minutes: number | null;
          resting_time_minutes: number | null;
          serving_size: string | null;
          servings: number;
          source: string | null;
          source_url: string | null;
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        ComputedFields: never;
        Insert: {
          author_name?: string | null;
          cook_time_minutes?: number | null;
          cooking_method?: string | null;
          created_at?: string;
          created_by: string;
          cuisine?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          dietary_labels?: string[];
          dietary_labels_verified?: string[];
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null;
          equipment?: string[];
          finished_weight_grams?: number | null;
          household_id?: string | null;
          id?: string;
          last_edited_by?: string | null;
          meal_type?: string[];
          original_author_id?: string | null;
          prep_time_minutes?: number | null;
          resting_time_minutes?: number | null;
          serving_size?: string | null;
          servings?: number;
          source?: string | null;
          source_url?: string | null;
          title: string;
          updated_at?: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Update: {
          author_name?: string | null;
          cook_time_minutes?: number | null;
          cooking_method?: string | null;
          created_at?: string;
          created_by?: string;
          cuisine?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          dietary_labels?: string[];
          dietary_labels_verified?: string[];
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null;
          equipment?: string[];
          finished_weight_grams?: number | null;
          household_id?: string | null;
          id?: string;
          last_edited_by?: string | null;
          meal_type?: string[];
          original_author_id?: string | null;
          prep_time_minutes?: number | null;
          resting_time_minutes?: number | null;
          serving_size?: string | null;
          servings?: number;
          source?: string | null;
          source_url?: string | null;
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_last_edited_by_fkey";
            columns: ["last_edited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_original_author_id_fkey";
            columns: ["original_author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_filters: {
        Row: {
          created_at: string;
          filter: NonNullable<Json>;
          household_id: string | null;
          id: string;
          name: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          filter?: NonNullable<Json>;
          household_id?: string | null;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          filter?: NonNullable<Json>;
          household_id?: string | null;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_filters_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_filters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_list_items: {
        Row: {
          added_by: string | null;
          category: string | null;
          checked_at: string | null;
          checked_by: string | null;
          created_at: string;
          id: string;
          ingredient_name: string;
          is_checked: boolean;
          quantity: number | null;
          recipe_id: string | null;
          shopping_list_id: string;
          sort_order: number;
          unit: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          category?: string | null;
          checked_at?: string | null;
          checked_by?: string | null;
          created_at?: string;
          id?: string;
          ingredient_name: string;
          is_checked?: boolean;
          quantity?: number | null;
          recipe_id?: string | null;
          shopping_list_id: string;
          sort_order?: number;
          unit?: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        Update: {
          added_by?: string | null;
          category?: string | null;
          checked_at?: string | null;
          checked_by?: string | null;
          created_at?: string;
          id?: string;
          ingredient_name?: string;
          is_checked?: boolean;
          quantity?: number | null;
          recipe_id?: string | null;
          shopping_list_id?: string;
          sort_order?: number;
          unit?: Database["public"]["Enums"]["measurement_unit"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_items_checked_by_fkey";
            columns: ["checked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey";
            columns: ["shopping_list_id"];
            isOneToOne: false;
            referencedRelation: "shopping_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_lists: {
        Row: {
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          is_archived: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          is_archived?: boolean;
          name?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          is_archived?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_lists_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_lists_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          created_by: string;
          household_id: string | null;
          id: string;
          name: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          household_id?: string | null;
          id?: string;
          name: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Update: {
          created_at?: string;
          created_by?: string;
          household_id?: string | null;
          id?: string;
          name?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tags_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      archive_household: { Args: { p_household_id: string }; Returns: undefined };
      can_edit_collection: { Args: { p_collection_id: string }; Returns: boolean };
      can_edit_ingredient: { Args: { p_ingredient_id: string }; Returns: boolean };
      can_edit_recipe: { Args: { p_recipe_id: string }; Returns: boolean };
      can_edit_tag: { Args: { p_tag_id: string }; Returns: boolean };
      can_view_collection: { Args: { p_collection_id: string }; Returns: boolean };
      can_view_ingredient: { Args: { p_ingredient_id: string }; Returns: boolean };
      can_view_recipe: { Args: { p_recipe_id: string }; Returns: boolean };
      can_view_tag: { Args: { p_tag_id: string }; Returns: boolean };
      change_member_role: {
        Args: {
          p_household_id: string;
          p_member_user_id: string;
          p_new_role: Database["public"]["Enums"]["household_role"];
        };
        Returns: undefined;
      };
      create_household: { Args: { p_name: string }; Returns: string };
      create_ingredient: {
        Args: { p_conversions: Json; p_ingredient: Json; p_nutrition: Json };
        Returns: string;
      };
      create_invitation: {
        Args: {
          p_email: string;
          p_household_id: string;
          p_role: Database["public"]["Enums"]["household_role"];
        };
        Returns: {
          expires_at: string;
          invitation_id: string;
          raw_token: string;
        }[];
      };
      create_recipe: {
        Args: { p_ingredients: Json; p_recipe: Json; p_steps: Json };
        Returns: string;
      };
      current_household_role: {
        Args: { p_household_id: string };
        Returns: Database["public"]["Enums"]["household_role"];
      };
      decline_invitation: { Args: { p_token: string }; Returns: undefined };
      duplicate_recipe: {
        Args: {
          p_recipe_id: string;
          p_target_household_id?: string;
          p_target_visibility: Database["public"]["Enums"]["recipe_visibility"];
        };
        Returns: string;
      };
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: {
          expires_at: string;
          household_name: string;
          invited_by_name: string;
          invitee_email: string;
          role: Database["public"]["Enums"]["household_role"];
          status: Database["public"]["Enums"]["invitation_status"];
        }[];
      };
      has_household_role: {
        Args: { p_household_id: string; p_min_role: Database["public"]["Enums"]["household_role"] };
        Returns: boolean;
      };
      is_household_member: { Args: { p_household_id: string }; Returns: boolean };
      leave_household: { Args: { p_household_id: string }; Returns: undefined };
      log_activity: {
        Args: {
          p_action: string;
          p_household_id: string;
          p_metadata?: Json;
          p_resource_id: string;
          p_resource_type: string;
        };
        Returns: string;
      };
      remove_household_member: {
        Args: { p_household_id: string; p_member_user_id: string };
        Returns: undefined;
      };
      restore_household: { Args: { p_household_id: string }; Returns: undefined };
      restore_recipe: { Args: { p_recipe_id: string }; Returns: undefined };
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      shares_household_with: { Args: { p_user_id: string }; Returns: boolean };
      soft_delete_recipe: { Args: { p_recipe_id: string }; Returns: undefined };
      toggle_shopping_list_item: { Args: { p_item_id: string }; Returns: boolean };
      transfer_household_ownership: {
        Args: { p_household_id: string; p_new_owner_user_id: string };
        Returns: undefined;
      };
      update_ingredient: {
        Args: {
          p_conversions: Json;
          p_ingredient: Json;
          p_ingredient_id: string;
          p_nutrition: Json;
        };
        Returns: undefined;
      };
      update_recipe: {
        Args: { p_ingredients: Json; p_recipe: Json; p_recipe_id: string; p_steps: Json };
        Returns: undefined;
      };
      update_recipe_dietary_labels: {
        Args: { p_labels: string[]; p_recipe_id: string; p_verified: string[] };
        Returns: undefined;
      };
    };
    Enums: {
      household_role: "owner" | "editor" | "viewer";
      invitation_status: "pending" | "accepted" | "declined" | "revoked" | "expired";
      meal_type: "breakfast" | "lunch" | "dinner" | "snack";
      measurement_unit:
        | "g"
        | "kg"
        | "ml"
        | "l"
        | "tsp"
        | "tbsp"
        | "cup"
        | "piece"
        | "slice"
        | "clove";
      recipe_difficulty: "easy" | "medium" | "hard";
      recipe_visibility: "personal" | "household";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      household_role: ["owner", "editor", "viewer"],
      invitation_status: ["pending", "accepted", "declined", "revoked", "expired"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      measurement_unit: ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece", "slice", "clove"],
      recipe_difficulty: ["easy", "medium", "hard"],
      recipe_visibility: ["personal", "household"],
    },
  },
} as const;
