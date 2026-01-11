/**
 * Service Status Monitoring
 * Checks health of critical external dependencies: OpenRouter, Supabase (implied).
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  details?: string;
}

/**
 * Check OpenRouter API availability
 * Uses the /models endpoint as a lightweight health check
 */
export async function checkOpenRouterHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  if (!process.env.OPENROUTER_API_KEY) {
      return {
          service: "OpenRouter",
          status: "down",
          details: "Configuration Missing (OPENROUTER_API_KEY)"
      };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
        return {
            service: "OpenRouter",
            status: "degraded",
            details: `HTTP ${response.status} ${response.statusText}`
        };
    }
    
    return {
      service: "OpenRouter",
      status: "healthy",
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      service: "OpenRouter",
      status: "down",
      details: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

/**
 * Check Supabase Database availability
 * simple query to ensure connection
 */
export async function checkDatabaseHealth(supabase: SupabaseClient): Promise<ServiceHealth> {
    const start = Date.now();
    try {
        const { error } = await supabase.from('audit_logs').select('count', { count: 'exact', head: true });
        
        if (error) throw error;

        return {
            service: "Supabase DB",
            status: "healthy",
            latencyMs: Date.now() - start
        };
    } catch (error) {
        return {
            service: "Supabase DB",
            status: "down",
            details: error instanceof Error ? error.message : "Query failed"
        };
    }
}
