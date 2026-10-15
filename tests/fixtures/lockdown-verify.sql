-- READ-ONLY. Does NOT touch the submission path. Run after a lockdown section to PROVE it took effect.
-- Every row in the 'section_1' group must show anon_can_run = false after Section 1; the 'section_3' group after Section 3. Service role access is expected to stay true.
select 'section_1' as part, f as function, has_function_privilege('anon', f::regprocedure, 'execute') as anon_can_run, has_function_privilege('authenticated', f::regprocedure, 'execute') as signed_in_can_run, has_function_privilege('service_role', f::regprocedure, 'execute') as service_role_can_run
from unnest(array[
  'public.companion_get_active_services(uuid, uuid)',
  'public.companion_get_client_trello_list(uuid, uuid)',
  'public.companion_get_intake_responses(uuid, uuid, uuid[])',
  'public.companion_get_order_trello_cards(uuid, uuid, uuid[])',
  'public.companion_submit_request(uuid, uuid, uuid, text, text, jsonb, text, text, uuid, uuid)',
  'public.delete_group_draft(uuid, uuid)',
  'public.find_or_create_ae(jsonb)',
  'public.find_or_create_client(jsonb)',
  'public.get_client_aes(uuid)',
  'public.get_client_agents(uuid)',
  'public.get_client_counties(uuid)',
  'public.get_client_details(uuid, uuid)',
  'public.get_client_service_flights(uuid)',
  'public.get_group_drafts(uuid)',
  'public.log_draft_save(uuid, text, text)',
  'public.set_client_trello_list_id(uuid, text)',
  'public.get_client_names(uuid[])'
]) as f
union all
select 'section_3', f, has_function_privilege('anon', f::regprocedure, 'execute'), has_function_privilege('authenticated', f::regprocedure, 'execute'), has_function_privilege('service_role', f::regprocedure, 'execute')
from unnest(array[
  'public.save_group_draft(uuid, uuid, text, text, jsonb)',
  'public.get_group_roster(uuid)',
  'public.get_group_clients(uuid)',
  'public.get_group_aes(uuid)'
]) as f
order by 1, 2;

-- And the two policies (after Sections 2A / 2B these should return NO rows):
select tablename, policyname from pg_policies where schemaname = 'public' and policyname in ('notification_settings_public_read', 'groups_public_read');
