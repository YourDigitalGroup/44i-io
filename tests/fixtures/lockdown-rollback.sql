-- ROLLBACK for the embed-key lockdown. Run only the part you need. Plain re-grants / re-create policy; the functions themselves were never dropped.

-- Undo SECTION 1
grant execute on function public.companion_get_active_services(uuid, uuid) to public, anon, authenticated;
grant execute on function public.companion_get_client_trello_list(uuid, uuid) to public, anon, authenticated;
grant execute on function public.companion_get_intake_responses(uuid, uuid, uuid[]) to public, anon, authenticated;
grant execute on function public.companion_get_order_trello_cards(uuid, uuid, uuid[]) to public, anon, authenticated;
grant execute on function public.companion_submit_request(uuid, uuid, uuid, text, text, jsonb, text, text, uuid, uuid) to public, anon, authenticated;
grant execute on function public.delete_group_draft(uuid, uuid) to public, anon, authenticated;
grant execute on function public.find_or_create_ae(jsonb) to public, anon, authenticated;
grant execute on function public.find_or_create_client(jsonb) to public, anon, authenticated;
grant execute on function public.get_client_aes(uuid) to public, anon, authenticated;
grant execute on function public.get_client_agents(uuid) to public, anon, authenticated;
grant execute on function public.get_client_counties(uuid) to public, anon, authenticated;
grant execute on function public.get_client_details(uuid, uuid) to public, anon, authenticated;
grant execute on function public.get_client_service_flights(uuid) to public, anon, authenticated;
grant execute on function public.get_group_drafts(uuid) to public, anon, authenticated;
grant execute on function public.log_draft_save(uuid, text, text) to public, anon, authenticated;
grant execute on function public.set_client_trello_list_id(uuid, text) to public, anon, authenticated;
grant execute on function public.get_client_names(uuid[]) to public, anon, authenticated;

-- Undo SECTION 2
create policy groups_public_read on public.groups for select to anon, authenticated using (true);
create policy notification_settings_public_read on public.notification_settings for select to anon, authenticated using (true);

-- Undo SECTION 3
grant execute on function public.save_group_draft(uuid, uuid, text, text, jsonb) to public, anon, authenticated;
grant execute on function public.get_group_roster(uuid) to public, anon, authenticated;
grant execute on function public.get_group_clients(uuid) to public, anon, authenticated;
grant execute on function public.get_group_aes(uuid) to public, anon, authenticated;
