-- accounting_get_status_history -- READ-ONLY: returns each campaign line's status changes so Accounting can work out what status a line had in a PAST month.
-- Touches nothing: no inserts, updates or deletes. NOT the submission path (no find_or_create_*, no orders trigger, no drafts, no form reads).
-- Same login check as accounting_get_closed_months (accounting or super). p_limit / p_offset let the page load it in pages like the other accounting reads.
CREATE OR REPLACE FUNCTION public.accounting_get_status_history(p_name text, p_pw text, p_limit integer DEFAULT NULL, p_offset integer DEFAULT 0)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid accounting credentials'; end if;
  if v_role not in ('accounting', 'super') then raise exception 'Accounting portal access is restricted'; end if;

  return query
  select jsonb_build_object(
    'campaign_line_id', h.campaign_line_id,
    'old_status', h.old_status,
    'new_status', h.new_status,
    'changed_at', h.changed_at)
  from campaign_status_history h
  order by h.changed_at, h.id
  limit p_limit offset coalesce(p_offset, 0);
end;
$function$;
