-- Add usage_status type
DO $$ BEGIN
    CREATE TYPE usage_status_type AS ENUM ('good_standing', 'flagged', 'upsell_required');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add usage columns to accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS usage_status usage_status_type NOT NULL DEFAULT 'good_standing',
ADD COLUMN IF NOT EXISTS consecutive_overage_months INTEGER NOT NULL DEFAULT 0;

-- Function: Process Billing Cycle
-- Handles: Closing old cycle, calc usage, updating status, opening new cycle
CREATE OR REPLACE FUNCTION public.process_billing_cycle(target_account_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_cycle RECORD;
    new_cycle_id UUID;
    total_tokens BIGINT := 0;
    total_checks BIGINT := 0;
    limit_tokens CONSTANT BIGINT := 10000000; -- 10M
    limit_checks CONSTANT BIGINT := 10;
    is_over_limit BOOLEAN := FALSE;
    new_status usage_status_type;
    new_overage_count INTEGER;
BEGIN
    -- 1. Find Open Cycle
    SELECT * INTO current_cycle
    FROM public.billing_cycles
    WHERE account_id = target_account_id
      AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no open cycle, just create one (first run case)
    IF current_cycle IS NULL THEN
        INSERT INTO public.billing_cycles (account_id, start_date, end_date, status)
        VALUES (target_account_id, NOW(), NOW() + INTERVAL '1 month', 'open')
        RETURNING id INTO new_cycle_id;
        
        RETURN json_build_object('status', 'created_initial', 'cycle_id', new_cycle_id);
    END IF;

    -- 2. Calculate Usage for this cycle
    SELECT 
        COALESCE(SUM(tokens_actual), 0),
        COUNT(*) FILTER (WHERE feature = 'consistency_check')
    INTO total_tokens, total_checks
    FROM public.ai_usage_events
    WHERE cycle_id = current_cycle.id;

    -- 3. Determine Overage
    IF total_tokens > limit_tokens OR total_checks > limit_checks THEN
        is_over_limit := TRUE;
    END IF;

    -- 4. Provide Grace/Flag Logic
    IF is_over_limit THEN
        -- Get current count, increment
        SELECT consecutive_overage_months INTO new_overage_count 
        FROM public.accounts WHERE id = target_account_id;
        
        new_overage_count := new_overage_count + 1;
        
        -- Status Transition
        IF new_overage_count >= 2 THEN
            new_status := 'upsell_required';
        ELSE
            new_status := 'flagged';
        END IF;

        -- Update Account
        UPDATE public.accounts
        SET consecutive_overage_months = new_overage_count,
            usage_status = new_status
        WHERE id = target_account_id;
    ELSE
        -- Reset if back in good standing
        new_status := 'good_standing';
        UPDATE public.accounts
        SET consecutive_overage_months = 0,
            usage_status = 'good_standing'
        WHERE id = target_account_id;
    END IF;

    -- 5. Close Old Cycle
    UPDATE public.billing_cycles
    SET status = 'closed',
        updated_at = NOW()
    WHERE id = current_cycle.id;

    -- 6. Open New Cycle
    INSERT INTO public.billing_cycles (account_id, start_date, end_date, status)
    VALUES (target_account_id, NOW(), NOW() + INTERVAL '1 month', 'open')
    RETURNING id INTO new_cycle_id;

    RETURN json_build_object(
        'status', 'rolled_over',
        'prev_tokens', total_tokens,
        'prev_checks', total_checks,
        'new_account_status', new_status,
        'new_cycle_id', new_cycle_id
    );
END;
$$;
