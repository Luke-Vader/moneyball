-- ============================================================
-- FIX: place_bid() used printf-style "%.2f" in RAISE EXCEPTION
-- messages. PL/pgSQL's RAISE only supports a bare "%" placeholder
-- with no format modifiers — ".2f" was being appended as literal
-- text (e.g. "70.00.2f" instead of "70.00"), confirmed via live
-- testing against the deployed function. Round the values before
-- interpolating instead.
-- ============================================================
create or replace function place_bid(p_lot_id uuid, p_amount numeric)
returns auction_bids
language plpgsql
security definer set search_path = public
as $$
declare
  v_club_id uuid := current_club_id();
  v_lot auction_lots;
  v_item_base numeric;
  v_current_high numeric;
  v_club_budget numeric;
  v_bid auction_bids;
begin
  if v_club_id is null then
    raise exception 'Only a club owner may place a bid';
  end if;

  select * into v_lot from auction_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lot not found';
  end if;
  if v_lot.status <> 'live' then
    raise exception 'This lot is not currently live';
  end if;

  select coalesce(max(amount), 0) into v_current_high from auction_bids where lot_id = p_lot_id;

  if v_lot.item_type = 'stadium' then
    select base_price into v_item_base from stadiums where id = v_lot.item_id;
  elsif v_lot.item_type = 'manager' then
    select base_price into v_item_base from managers where id = v_lot.item_id;
  else
    select base_price into v_item_base from players where id = v_lot.item_id;
  end if;

  if p_amount < v_item_base then
    raise exception 'Bid must be at least the base price (%)', round(v_item_base, 2);
  end if;
  if p_amount <= v_current_high then
    raise exception 'Bid must exceed the current highest bid (%)', round(v_current_high, 2);
  end if;

  select budget into v_club_budget from clubs where id = v_club_id for update;
  if p_amount > v_club_budget then
    raise exception 'Bid exceeds your remaining budget (% remaining)', round(v_club_budget, 2);
  end if;

  insert into auction_bids (lot_id, club_id, amount) values (p_lot_id, v_club_id, p_amount)
    returning * into v_bid;
  return v_bid;
end;
$$;
