-- READ-ONLY. Orders submitted with NO services (how AEs have been sending change requests). Run each query on its own.
-- QUERY 1: how many, by month and group
select to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month, coalesce(g.name, '(no group)') as grp, count(*) as empty_orders
from orders o left join groups g on g.id = o.group_id
where o.line_items is null or jsonb_typeof(o.line_items::text::jsonb) <> 'array' or jsonb_array_length(o.line_items::text::jsonb) = 0
group by 1, 2 order by 1 desc, 3 desc;

-- QUERY 2: the latest 25, with what the AE wrote
select o.created_at::date as date, coalesce(g.name, '(no group)') as grp, c.name as client, o.ae_name,
       left(coalesce(nullif(btrim(o.special_instructions), ''), nullif(btrim(o.campaign_notes), ''), '(no notes)'), 220) as notes
from orders o left join groups g on g.id = o.group_id left join clients c on c.id = o.client_id
where o.line_items is null or jsonb_typeof(o.line_items::text::jsonb) <> 'array' or jsonb_array_length(o.line_items::text::jsonb) = 0
order by o.created_at desc limit 25;
