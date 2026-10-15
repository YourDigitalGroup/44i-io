-- DOES NOT TOUCH THE SUBMISSION PATH. Lockdown prerequisites: two NEW login-protected functions (additive; nothing existing is changed or dropped).
--  1. admin_get_notification_settings: Admin's Settings tab and the approval emails read the always-BCC list through this instead of reading the table directly
--     (the table's public-read policy is dropped at lockdown).
--  2. admin_set_client_trello_list_id: Admin's "Reconcile" and "Retry Trello" link a client to its Trello list through this instead of the old public function
--     set_client_trello_list_id(p_client_id, p_trello_list_id) (that old function loses public access at lockdown).
-- Same login gate as admin_get_groups (any real login except strategist / accounting). Safe to run at any time; nothing uses them until the matching Admin code is merged.
CREATE OR REPLACE FUNCTION public.admin_get_notification_settings(p_name text, p_pw text)
 RETURNS SETOF notification_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  if v_role in ('strategist', 'accounting') then raise exception 'Admin portal access is restricted'; end if;
  return query select * from notification_settings where id = 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_client_trello_list_id(p_name text, p_pw text, p_client_id uuid, p_trello_list_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  if v_role in ('strategist', 'accounting') then raise exception 'Admin portal access is restricted'; end if;
  update clients set trello_list_id = p_trello_list_id where id = p_client_id;
  if not found then raise exception 'Client % not found', p_client_id; end if;
end;
$function$;
