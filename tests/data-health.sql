-- =====================================================================
-- 44i IO  --  CATALOG DATA-HEALTH CHECK  (READ-ONLY: SELECT only, writes nothing)
-- Does not touch the submission path. Safe to run any time.
--
-- HOW TO READ: every row returned is something that LOOKS WRONG. No rows for a
-- check = that check is clean. Columns: check_name | severity | service_id | detail
-- (Supabase shows only the LAST result set, so each QUERY below returns all of its checks
--  stacked into ONE table, labelled in the first column.)
--
-- RUN IT AS 3 SEPARATE QUERIES (select one block, press Run):
--   QUERY 1 = services catalog checks   (only needs services, sections, intake_forms,
--                                         hosting_proration_settings)
--   QUERY 2 = accounting_map checks     (needs accounting_map)
--   QUERY 3 = checks against saved data (groups, clients, campaign_lines, orders)
-- If a query errors with "relation ... does not exist" or "column ... does not exist",
-- that table/column name was a guess -- tell Claude which one and send the message.
--
-- Column names VERIFIED against the code (admin save payload / loaders):
--   services: id label accounting_label section pricing_mode default_price billing_type unit_label
--     modifier_amount is_cpm_adjustment retail_cpm koc_requirement koc_notify_* trello_suffix_text
--     strategist_disciplines intake_form_id tlp_page_cap workflow trello_template_ref
--     trello_template_type sort_order auto_add_setup_fee setup_fee setup_fee_threshold
--     cancel_penalty_type cancel_penalty_amount exclusivity_group spend_minimum subsection_label
--     hosting_prompt_type standalone_hosting_service_id auto_select_service_id tier pricing_group
--     tactic_variants qty_preset_options active
--   sections(id,label,sort_order,active)  intake_forms(id,title,definition,active)
--   hosting_proration_settings(page_type,label,days)
--   accounting_map(service_id,pair_with_service_id)  [read in code only through an RPC]
-- NOT verified (guessed): table names `groups`, `clients`, `campaign_lines`, `orders` and the
--   columns groups.io_pricing / groups.accounting_overrides / clients.io_pricing /
--   clients.accounting_overrides / campaign_lines.service_id / campaign_lines.billing_type /
--   orders.line_items (a json array of {service_id, fee, recurring, ...}).
--   io_pricing and accounting_overrides are written by the code as json objects keyed by service
--   id (accounting_overrides may also use the key "service_id|paired_service_id").
-- =====================================================================


-- =====================================================================
-- QUERY 1 of 3  --  SERVICES CATALOG
-- =====================================================================
with s as (select * from services where active),
-- distinct workflows that have at least one template-bearing service
wf_has_tpl as (
  select workflow from s
  where workflow is not null and btrim(workflow) <> '' and coalesce(btrim(trello_template_ref),'') <> ''
  group by workflow
),
-- ids that other columns point at
hosting_targets as (select distinct standalone_hosting_service_id as id from s where standalone_hosting_service_id is not null),
-- ids the code names literally (see audit Part 1). Missing/inactive = that feature silently stops.
anchors(id, why) as (values
  ('w-bs',      'index.html: defines the one-time website group (WEB_OTO); needs an exclusivity_group'),
  ('wm-1p',     'index.html: defines the monthly website group (WEB_MRR); needs an exclusivity_group'),
  ('sm-bp',     'index.html: anchors the Social tier lookup (tierOfSelected)'),
  ('sem-bp',    'index.html/shared.js/strategist: treated as the clicks (CPC) tactic'),
  ('w-bp',      'index.html: Website card name "10-page"'), ('wm-10p', 'index.html: Website card name "10-page"'),
  ('wm-ecomm',  'index.html: Website card name "10-page"'),
  ('w-bb',      'index.html: Website card name "5-page"'),  ('wm-5p',  'index.html: Website card name "5-page"'),
  ('tlp-custom','index.html: custom Top Local Pages grid'),
  ('seo-bs',    'strategist: SEO tier list for LLO / Rep Monitoring lines'),
  ('seo-bb',    'strategist: SEO tier list'), ('seo-bp', 'strategist: SEO tier list'),
  ('yttv-bp',   'strategist/accounting: the only "Addl. Targeting" tactic'),
  ('llo-bp',    'strategist/accounting: flat-fee tracked service (comments say it may have NO catalog row)'),
  ('rep-bp',    'strategist/accounting: flat-fee tracked service (comments say it may have NO catalog row)')
)

select 'C01 billing_type not one_time/monthly/yearly/annual' as check_name, 'HIGH' as severity, id as service_id,
       'billing_type = ' || coalesce('"'||billing_type||'"','NULL') || '  (code only knows those 4; anything else is shown with no frequency and treated as monthly)' as detail
  from s where billing_type is null or billing_type not in ('one_time','monthly','yearly','annual')
union all
select 'C02 pricing_mode not flat/per_unit/modifier/spend', 'HIGH', id,
       'pricing_mode = ' || coalesce('"'||pricing_mode||'"','NULL')
  from s where pricing_mode is null or pricing_mode not in ('flat','per_unit','modifier','spend')
union all
select 'C03 yearly/annual mixed spellings in use', 'LOW', string_agg(id, ', '),
       'Both "yearly" and "annual" exist; code treats them the same but pick one so reports are consistent'
  from s where billing_type in ('yearly','annual') having count(distinct billing_type) > 1
union all
select 'C04 yearly/annual billing on a spend or modifier service', 'MEDIUM', id,
       'billing_type=' || billing_type || ' but pricing_mode=' || pricing_mode || ' -- spend lines are always shown /mo; modifiers say "Add-on, Yearly" only'
  from s where billing_type in ('yearly','annual') and pricing_mode in ('spend','modifier')
union all
select 'C05 template set but type blank/invalid', 'HIGH', id,
       'trello_template_ref=' || trello_template_ref || ', trello_template_type=' || coalesce('"'||trello_template_type||'"','NULL') || ' (blank is silently treated as "list")'
  from s where coalesce(btrim(trello_template_ref),'') <> '' and (trello_template_type is null or trello_template_type not in ('list','card'))
union all
select 'C06 template type set but no ref', 'MEDIUM', id,
       'trello_template_type=' || trello_template_type || ' with empty trello_template_ref (no card will be built from it)'
  from s where coalesce(btrim(trello_template_ref),'') = '' and trello_template_type = 'card'
union all
select 'C07 type "list" but ref is not a 24-char Trello id', 'HIGH', id,
       'list ref "' || trello_template_ref || '" (' || length(trello_template_ref) || ' chars). A card short-code (8 chars) here makes the code fall back to a bare card'
  from s where trello_template_type = 'list' and coalesce(btrim(trello_template_ref),'') <> '' and trello_template_ref !~ '^[0-9a-f]{24}$'
union all
select 'C08 type "card" but ref is neither 8-char short code nor 24-hex id', 'HIGH', id,
       'card ref "' || trello_template_ref || '" (' || length(trello_template_ref) || ' chars)'
  from s where trello_template_type = 'card' and coalesce(btrim(trello_template_ref),'') <> '' and trello_template_ref !~ '^[0-9a-f]{24}$' and trello_template_ref !~ '^[A-Za-z0-9]{8}$'
union all
select 'C09 ref has stray spaces / newline / URL pasted', 'MEDIUM', id,
       'trello_template_ref = [' || trello_template_ref || ']'
  from s where trello_template_ref ~ '(\s|/|https?:)'
union all
select 'C10 same template ref used with two different types', 'HIGH', trello_template_ref,
       'used as both list and card by: ' || string_agg(id || '(' || coalesce(trello_template_type,'NULL') || ')', ', ')
  from s where coalesce(btrim(trello_template_ref),'') <> '' group by trello_template_ref having count(distinct coalesce(trello_template_type,'NULL')) > 1
union all
select 'C11 workflow set but no template anywhere in that workflow', 'MEDIUM', string_agg(s.id, ', '),
       'workflow "' || s.workflow || '" has ' || count(*) || ' service(s) and NONE carries a trello_template_ref -> no Trello card is built for them'
  from s where s.workflow is not null and btrim(s.workflow) <> '' and s.workflow not in (select workflow from wf_has_tpl) group by s.workflow
union all
select 'C12 template but no workflow (becomes its own standalone card)', 'LOW', id,
       'has trello_template_ref but workflow is empty; the card title/chip falls back to the service LABEL ("' || label || '")'
  from s where coalesce(btrim(trello_template_ref),'') <> '' and (workflow is null or btrim(workflow) = '')
union all
select 'C13 standalone hosting service has no workflow/template', 'HIGH', s.id,
       'target of a standalone_hosting_service_id but has no workflow and no template. A hosting-only order has nothing to name its card from'
  from s join hosting_targets h on h.id = s.id
  where (s.workflow is null or btrim(s.workflow) = '') and coalesce(btrim(s.trello_template_ref),'') = ''
union all
select 'C14 workflow/group names that differ only by case or spaces', 'MEDIUM', min(v), 'near-duplicates: ' || string_agg(distinct v, ' | ')
  from (select workflow v from s where workflow is not null) x group by lower(regexp_replace(v,'\s+',' ','g')) having count(distinct v) > 1
union all
select 'C15 exclusivity_group names that differ only by case/spaces', 'HIGH', min(v), 'near-duplicates (would NOT exclude each other): ' || string_agg(distinct v, ' | ')
  from (select exclusivity_group v from s where exclusivity_group is not null) x group by lower(regexp_replace(v,'\s+',' ','g')) having count(distinct v) > 1
union all
select 'C16 exclusivity_group with only ONE member', 'MEDIUM', min(id), 'group "' || exclusivity_group || '" has a single active member (nothing to exclude); the other members may be deactivated'
  from s where exclusivity_group is not null group by exclusivity_group having count(*) = 1
union all
select 'C17 exclusivity_group spans several sections', 'LOW', exclusivity_group, 'sections: ' || string_agg(distinct section, ', ') || ' (intended only for the Website one-time/monthly pair)'
  from s where exclusivity_group is not null group by exclusivity_group having count(distinct section) > 1
union all
select 'C18 auto_select_service_id points at missing/inactive/self', 'HIGH', a.id,
       'auto_select_service_id = ' || a.auto_select_service_id || case when a.auto_select_service_id = a.id then ' (itself)' else ' (does not exist or inactive)' end
  from s a where a.auto_select_service_id is not null and (a.auto_select_service_id = a.id or not exists (select 1 from s t where t.id = a.auto_select_service_id))
union all
select 'C19 standalone_hosting_service_id points at missing/inactive/self', 'HIGH', a.id,
       'standalone_hosting_service_id = ' || a.standalone_hosting_service_id
  from s a where a.standalone_hosting_service_id is not null and (a.standalone_hosting_service_id = a.id or not exists (select 1 from s t where t.id = a.standalone_hosting_service_id))
union all
select 'C20 standalone hosting target has no price', 'HIGH', t.id,
       'target of a hosting link but default_price is NULL/0 -> proration computes $0 hosting'
  from s t join hosting_targets h on h.id = t.id where coalesce(t.default_price,0) <= 0
union all
select 'C21 hosting_prompt_type outside 1p/5p/10p/ecomm', 'HIGH', id, 'hosting_prompt_type = "' || hosting_prompt_type || '"'
  from s where hosting_prompt_type is not null and hosting_prompt_type not in ('1p','5p','10p','ecomm')
union all
select 'C22 hosting_prompt_type without a standalone hosting link (or vice versa)', 'HIGH', id,
       'hosting_prompt_type=' || coalesce(hosting_prompt_type,'NULL') || ', standalone_hosting_service_id=' || coalesce(standalone_hosting_service_id,'NULL')
  from s where (hosting_prompt_type is null) <> (standalone_hosting_service_id is null)
union all
select 'C23 hosting_prompt_type has no row in hosting_proration_settings (or blank days/label)', 'HIGH', s.id,
       'page_type "' || s.hosting_prompt_type || '" missing or incomplete in hosting_proration_settings'
  from s where s.hosting_prompt_type in ('1p','5p','10p','ecomm')
   and not exists (select 1 from hosting_proration_settings h where h.page_type = s.hosting_prompt_type and h.days is not null and coalesce(btrim(h.label),'') <> '')
union all
select 'C24 tier value not starter/builder/pro', 'MEDIUM', id, 'tier = "' || tier || '"'
  from s where tier is not null and tier not in ('starter','builder','pro')
union all
select 'C25 tier set but service is in no exclusivity group', 'MEDIUM', id, 'tier=' || tier || ' but exclusivity_group is empty (tier lookup walks the anchor''s group)'
  from s where tier is not null and exclusivity_group is null
union all
select 'C26 intake_form_id not in active intake_forms', 'HIGH', s.id, 'intake_form_id = "' || s.intake_form_id || '"'
  from s where s.intake_form_id is not null and not exists (select 1 from intake_forms f where f.id = s.intake_form_id and f.active)
union all
select 'C27 tlp_page_cap set but intake form is not tlp', 'LOW', id, 'tlp_page_cap=' || tlp_page_cap || ', intake_form_id=' || coalesce(intake_form_id,'NULL')
  from s where tlp_page_cap is not null and coalesce(intake_form_id,'') <> 'tlp'
union all
select 'C28 intake form is tlp but no page cap (and not tlp-custom)', 'HIGH', id, 'intake_form_id=tlp, tlp_page_cap is NULL -> no page grid is shown'
  from s where intake_form_id = 'tlp' and tlp_page_cap is null and id <> 'tlp-custom'
union all
select 'C29 koc_requirement not none/required', 'MEDIUM', id, 'koc_requirement = ' || coalesce('"'||koc_requirement||'"','NULL') || ' (blank is read as none)'
  from s where koc_requirement is null or koc_requirement not in ('none','required')
union all
select 'C30 KOC notify info half filled', 'LOW', id, 'koc_notify_name=' || coalesce(koc_notify_name,'NULL') || ' / handle=' || coalesce(koc_notify_trello_handle,'NULL') || ' / calendar=' || coalesce(koc_notify_calendar_url,'NULL')
  from s where (koc_notify_name is not null) <> (koc_notify_trello_handle is not null or koc_notify_calendar_url is not null)
union all
select 'C31 strategist_disciplines empty', 'MEDIUM', id, 'no discipline -> no strategist is routed/handled for this service'
  from s where strategist_disciplines is null or to_jsonb(strategist_disciplines) = '[]'::jsonb
union all
select 'C32 strategist_disciplines has a value outside digital/social/web', 'MEDIUM', id, 'value "' || d || '"'
  from s, lateral jsonb_array_elements_text(case when strategist_disciplines is null then '[]'::jsonb else to_jsonb(strategist_disciplines) end) d
  where d not in ('digital','social','web')
union all
select 'C33 spend service without retail_cpm (not SEM)', 'HIGH', id, 'pricing_mode=spend, retail_cpm is NULL -> treated as a clicks (CPC) campaign; Goal/impressions cannot be computed'
  from s where pricing_mode = 'spend' and retail_cpm is null and id <> 'sem-bp'
union all
select 'C34 spend service has retail_cpm <= 0', 'HIGH', id, 'retail_cpm = ' || retail_cpm
  from s where pricing_mode = 'spend' and retail_cpm is not null and retail_cpm <= 0
union all
select 'C35 spend service with spend_minimum NULL or 0', 'MEDIUM', id, 'spend_minimum = ' || coalesce(spend_minimum::text,'NULL') || ' (0 and blank both mean "no minimum"; confirm that is intended)'
  from s where pricing_mode = 'spend' and coalesce(spend_minimum,0) = 0
union all
select 'C36 spend-only fields left on a non-spend service', 'MEDIUM', id,
       'pricing_mode=' || pricing_mode || ' but spend_minimum=' || coalesce(spend_minimum::text,'NULL') || ', retail_cpm=' || coalesce(retail_cpm::text,'NULL') || ', tactic_variants=' || coalesce(tactic_variants::text,'NULL')
  from s where pricing_mode <> 'spend' and not coalesce(is_cpm_adjustment,false)
   and (spend_minimum is not null or retail_cpm is not null or (tactic_variants is not null and to_jsonb(tactic_variants) <> '[]'::jsonb))
union all
select 'C37 flat/per_unit with no price (quote-on-request?)', 'LOW', id, 'default_price NULL on a ' || pricing_mode || ' service -- shows "Quote $" box; fine ONLY if this is intentionally quote-on-request'
  from s where pricing_mode in ('flat','per_unit') and default_price is null
union all
select 'C38 per_unit without unit_label', 'MEDIUM', id, 'per_unit service has no unit_label'
  from s where pricing_mode = 'per_unit' and coalesce(btrim(unit_label),'') = ''
union all
select 'C39 qty_preset_options malformed', 'MEDIUM', id, 'qty_preset_options = ' || qty_preset_options::text
  from s where qty_preset_options is not null
   and (pricing_mode <> 'per_unit' or jsonb_typeof(to_jsonb(qty_preset_options)) <> 'array' or to_jsonb(qty_preset_options) = '[]'::jsonb)
union all
select 'C40 modifier with no amount and not a CPM adjustment', 'MEDIUM', id, 'modifier_amount is NULL -> shows as an unpriced add-on'
  from s where pricing_mode = 'modifier' and modifier_amount is null and not coalesce(is_cpm_adjustment,false)
union all
select 'C41 modifier with no parent service in its section', 'MEDIUM', m.id, 'no active spend/flat service in section "' || m.section || '" for this modifier to ride on'
  from s m where m.pricing_mode = 'modifier'
   and not exists (select 1 from s p where p.section = m.section and p.pricing_mode in ('spend','flat','per_unit'))
union all
select 'C42 CPM-adjustment modifier the code cannot recognise as "offline"', 'HIGH', m.id,
       'is_cpm_adjustment=true but neither label nor id contains "offline"; strategist/accounting match on that word, so combined CPM is skipped'
  from s m where m.is_cpm_adjustment and (coalesce(m.label,'') || ' ' || m.id) !~* 'offline'
union all
select 'C43 CPM-adjustment modifier in a section with no spend tactic', 'MEDIUM', m.id, 'is_cpm_adjustment but section "' || m.section || '" has no active spend service'
  from s m where m.is_cpm_adjustment and not exists (select 1 from s p where p.section = m.section and p.pricing_mode = 'spend')
union all
select 'C44 auto_add_setup_fee on but setup_fee blank', 'HIGH', id, 'auto_add_setup_fee=true, setup_fee=' || coalesce(setup_fee::text,'NULL')
  from s where auto_add_setup_fee and coalesce(setup_fee,0) <= 0
union all
select 'C45 cancel penalty type set but amount missing', 'MEDIUM', id, 'cancel_penalty_type=' || cancel_penalty_type || ', amount=' || coalesce(cancel_penalty_amount::text,'NULL')
  from s where cancel_penalty_type in ('flat','percent_remaining') and cancel_penalty_amount is null
union all
select 'C46 duplicate sort_order inside a section', 'LOW', string_agg(id, ', '), 'section "' || section || '" sort_order ' || sort_order || ' used ' || count(*) || ' times (row order is a coin-flip)'
  from s where sort_order is not null group by section, sort_order having count(*) > 1
union all
select 'C47 sort_order missing', 'LOW', id, 'sort_order is NULL'
  from s where sort_order is null
union all
select 'C48 service section missing from sections table or inactive', 'HIGH', s.id, 'section "' || s.section || '"' || case when sc.id is null then ' does not exist' else ' is inactive' end || ' -> row is hidden or unlabelled on the form'
  from s left join sections sc on sc.id = s.section where sc.id is null or not coalesce(sc.active,false)
union all
select 'C49 active section with no active services', 'LOW', sc.id, 'empty section "' || coalesce(sc.label,'') || '"'
  from sections sc where sc.active and not exists (select 1 from s where s.section = sc.id)
union all
select 'C50 label / accounting_label collisions among active services', 'MEDIUM', string_agg(id, ', '),
       'same name "' || nm || '" on several services; Accounting bulk import and the tactic picker take the FIRST match'
  from (select id, lower(btrim(coalesce(nullif(btrim(accounting_label),''), label))) nm from s where pricing_mode <> 'modifier') x
  group by nm having count(*) > 1
union all
select 'C51 spend service with no accounting_label', 'LOW', id, 'Accounting shows the form label "' || label || '" (fine if that is the intended name)'
  from s where pricing_mode = 'spend' and coalesce(btrim(accounting_label),'') = ''
union all
select 'C52 service id has characters that break keys', 'HIGH', id, 'id contains "|", "+", a space, an uppercase letter or quotes -- accounting_overrides keys use "id|id" and bulk aliases use "id+visits"'
  from s where id ~ '[|+\s''"A-Z]'
union all
select 'C53 tactic_variants not a clean text list', 'MEDIUM', id, 'tactic_variants = ' || tactic_variants::text
  from s where tactic_variants is not null
   and (jsonb_typeof(to_jsonb(tactic_variants)) <> 'array'
        or exists (select 1 from jsonb_array_elements_text(to_jsonb(tactic_variants)) e where btrim(e) = ''))
union all
select 'C54 literal ids the code depends on: missing or inactive', 'HIGH', a.id, a.why
  from anchors a where not exists (select 1 from s where s.id = a.id) and a.id not in ('llo-bp','rep-bp')
union all
select 'C55 llo-bp / rep-bp present as catalog rows', 'LOW', id, 'code lists these as flat tracked services; confirm the rows are real and active. (Strategist comments say they have no row of their own.)'
  from s where id in ('llo-bp','rep-bp') and pricing_mode = 'spend'
union all
select 'C56 website anchors not in an exclusivity group', 'HIGH', id, 'index.html finds the website one-time/monthly groups through this id; with no exclusivity_group the "pick one-time OR monthly" lock does nothing'
  from s where id in ('w-bs','wm-1p') and exclusivity_group is null
union all
select 'C57 workflow named exactly "Website" but no active service uses it', 'HIGH', 'Website', 'index.html renames the Website card by sold tier only when the workflow is literally "Website"'
  where not exists (select 1 from s where workflow = 'Website')
order by 1, 3;


-- =====================================================================
-- QUERY 2 of 3  --  ACCOUNTING MAP  (run separately)
-- =====================================================================
with s as (select * from services where active)
select 'M01 spend service has NO accounting_map row' as check_name, 'HIGH' as severity, s.id as service_id,
       'Accounting/Strategist cannot compute budget/CPM for it ("MISSING" badge in Admin > Accounting Map)' as detail
  from s where s.pricing_mode = 'spend' and not s.is_cpm_adjustment
   and not exists (select 1 from accounting_map m where m.service_id = s.id and coalesce(m.pair_with_service_id,'') = '')
union all
select 'M02 accounting_map row for a service that is missing/inactive', 'MEDIUM', m.service_id, 'pair_with=' || coalesce(m.pair_with_service_id,'(none)')
  from accounting_map m where not exists (select 1 from s where s.id = m.service_id)
union all
select 'M03 accounting_map pair_with_service_id missing/inactive', 'MEDIUM', m.service_id, 'pair_with_service_id = ' || m.pair_with_service_id
  from accounting_map m where coalesce(m.pair_with_service_id,'') <> '' and not exists (select 1 from s where s.id = m.pair_with_service_id)
union all
select 'M04 duplicate accounting_map rows (same service + pair)', 'HIGH', service_id, 'pair=' || coalesce(pair_with_service_id,'(none)') || ' appears ' || count(*) || ' times'
  from accounting_map group by service_id, coalesce(pair_with_service_id,''), pair_with_service_id having count(*) > 1
order by 1, 3;


-- =====================================================================
-- QUERY 3 of 3  --  SAVED DATA vs CATALOG  (run separately; table names are guesses)
-- =====================================================================
with s_all as (select id, active, billing_type from services),
grp_keys as (
  select 'groups' as src, g.id::text as owner, k.key, 'io_pricing' as col
    from groups g, lateral jsonb_object_keys(case when jsonb_typeof(nullif(g.io_pricing::text,'')::jsonb) = 'object' then g.io_pricing::text::jsonb else '{}'::jsonb end) k(key)
  union all
  select 'groups', g.id::text, split_part(k.key,'|',1), 'accounting_overrides'
    from groups g, lateral jsonb_object_keys(case when jsonb_typeof(nullif(g.accounting_overrides::text,'')::jsonb) = 'object' then g.accounting_overrides::text::jsonb else '{}'::jsonb end) k(key)
  union all
  select 'clients', c.id::text, k.key, 'io_pricing'
    from clients c, lateral jsonb_object_keys(case when jsonb_typeof(nullif(c.io_pricing::text,'')::jsonb) = 'object' then c.io_pricing::text::jsonb else '{}'::jsonb end) k(key)
  union all
  select 'clients', c.id::text, split_part(k.key,'|',1), 'accounting_overrides'
    from clients c, lateral jsonb_object_keys(case when jsonb_typeof(nullif(c.accounting_overrides::text,'')::jsonb) = 'object' then c.accounting_overrides::text::jsonb else '{}'::jsonb end) k(key)
),
order_items as (
  select o.id::text as order_id, item->>'service_id' as service_id,
         coalesce(nullif(item->>'recurring','')::numeric,0) as recurring, coalesce(nullif(item->>'fee','')::numeric,0) as fee
  from orders o, lateral jsonb_array_elements(case when jsonb_typeof(o.line_items::text::jsonb) = 'array' then o.line_items::text::jsonb else '[]'::jsonb end) item
)
select 'D01 custom price/accounting override for a service that no longer exists' as check_name, 'MEDIUM' as severity,
       key as service_id, src || ' ' || owner || ' (' || col || ')' as detail
  from grp_keys where not exists (select 1 from s_all a where a.id = grp_keys.key)
union all
select 'D02 custom price/accounting override for an INACTIVE service', 'LOW', key, src || ' ' || owner || ' (' || col || ')'
  from grp_keys g join s_all a on a.id = g.key where not a.active
union all
select 'D03 campaign_lines.service_id not in services', 'HIGH', service_id, count(*) || ' campaign line(s)'
  from campaign_lines cl where service_id is not null and not exists (select 1 from s_all a where a.id = cl.service_id) group by service_id
union all
select 'D04 campaign_lines on an INACTIVE service', 'MEDIUM', service_id, count(*) || ' line(s); the screens only load active services, so billing_type/labels fall back to monthly/blank'
  from campaign_lines cl join s_all a on a.id = cl.service_id where not a.active group by service_id
union all
select 'D05 campaign_lines.billing_type not spend/recurring/one_time', 'MEDIUM', service_id, 'billing_type = "' || coalesce(billing_type,'NULL') || '" on ' || count(*) || ' line(s)'
  from campaign_lines where billing_type is null or billing_type not in ('spend','recurring','one_time') group by service_id, billing_type
union all
select 'D06 order line_items.service_id not in services', 'HIGH', service_id, count(*) || ' order line(s), e.g. order ' || min(order_id)
  from order_items oi where service_id is not null and not exists (select 1 from s_all a where a.id = oi.service_id) group by service_id
union all
select 'D07 order line_items on an INACTIVE service', 'MEDIUM', service_id, count(*) || ' order line(s); old orders show /mo and count as monthly if the service was yearly'
  from order_items oi join s_all a on a.id = oi.service_id where not a.active group by service_id
union all
select 'D08 order lines whose money type disagrees with today''s billing_type', 'LOW', oi.service_id,
       count(*) || ' line(s): catalog now says ' || a.billing_type || ' but the order stored ' || case when oi.recurring > 0 then 'recurring' else 'one-time fee' end || ' (billing_type was edited after orders were taken?)'
  from order_items oi join s_all a on a.id = oi.service_id
  where (a.billing_type = 'one_time' and oi.recurring > 0) or (a.billing_type in ('monthly','yearly','annual') and oi.fee > 0 and oi.recurring = 0)
  group by oi.service_id, a.billing_type, (oi.recurring > 0)
order by 1, 3;
