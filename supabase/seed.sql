-- ============================================================
-- MONEYBALL ALPHA — SEED DATA
-- Applied automatically by `supabase db reset` (local) or run
-- manually against a hosted project after the migrations above.
-- Uses fixed UUIDs for clubs so the fixture list can reference
-- them directly — rename clubs later via the Registration flow
-- without touching these IDs.
-- ============================================================

-- ---------- 6 CLUBS (placeholder names — renamed during Registration) ----------
insert into clubs (id, name) values
  ('00000000-0000-0000-0000-000000000001','Club 1'),
  ('00000000-0000-0000-0000-000000000002','Club 2'),
  ('00000000-0000-0000-0000-000000000003','Club 3'),
  ('00000000-0000-0000-0000-000000000004','Club 4'),
  ('00000000-0000-0000-0000-000000000005','Club 5'),
  ('00000000-0000-0000-0000-000000000006','Club 6');

-- ---------- 10 STADIUMS ----------
insert into stadiums (name, category, base_price, matchday_revenue, maintenance, home_advantage_stars, passive_ability) values
('Wembley Stadium','Commercial Powerhouse',65,9,3,5,'Elite Hospitality — +Rs2M after every home win'),
('Santiago Bernabéu','Commercial Powerhouse',58,9,2.5,5,'Global Brand — +Rs1M sponsorship per home fixture'),
('Old Trafford','Fortress',55,8,2.5,4.5,'Winning Mentality — +2 Morale if club is Top 3'),
('Anfield','Fortress',52,7,2,5,'You''ll Never Walk Alone — +5 Morale before home fixtures'),
('Signal Iduna Park','Fortress',48,7,2,5,'Yellow Wall — away attackers get -3 Composure'),
('Allianz Arena','Elite Facilities',46,7,2,4.5,'Recovery Centre — +5 Fitness after every matchweek'),
('San Siro','Atmosphere',42,6,1.8,4.5,'European Nights — +3 Morale before marquee fixtures'),
('Emirates Stadium','Elite Facilities',40,6,1.8,4.5,'Sharp Start — +2 Match Confidence if Fitness > 90'),
('Maracanã','Atmosphere',38,5,1.5,4.5,'Samba Spirit — wingers get +2 Match Confidence at home'),
('Johan Cruyff Arena','Football Heritage',36,5,1.5,4.5,'Total Football — midfielders get +2 Match Confidence at home');

-- ---------- 5 MANAGERS ----------
insert into managers (name, style, base_price, special_ability) values
('Luis Enrique','Possession',26,'Positional Play — Passing/Dribbling squad average counts double toward strength'),
('Jürgen Klopp','Gegenpress',28,'High Press — away opposition Fitness drains faster per match'),
('Diego Simeone','Park the Bus',24,'Defensive Block — reduces variance, caps goals conceded distribution'),
('José Mourinho','Counter-attack',22,'Transition — bonus strength when Pace average is high'),
('Marcelo Bielsa','Wing Play',20,'Overload — wingers contribute extra to attack strength');

-- ---------- 35 PLAYERS (FC 26–sourced ratings) ----------
insert into players (name, position, real_club, nationality, overall, pace, shooting, passing, dribbling, defending, physical, base_price, tier) values
('Kylian Mbappé','ST','Real Madrid','France',92,97,90,80,92,40,78,48,'Elite Attackers'),
('Mohamed Salah','RW','Liverpool','Egypt',91,89,88,85,90,45,75,44,'Elite Attackers'),
('Erling Haaland','ST','Manchester City','Norway',91,88,91,65,80,45,88,44,'Elite Attackers'),
('Vinícius Jr.','LW','Real Madrid','Brazil',91,94,85,80,91,35,68,44,'Elite Attackers'),
('Kevin De Bruyne','CAM','Manchester City','Belgium',91,72,85,92,87,65,78,44,'Elite Midfielders'),
('Virgil van Dijk','CB','Liverpool','Netherlands',90,78,60,75,72,90,87,40,'Elite Defenders'),
('Rodri','CDM','Manchester City','Spain',90,68,72,86,80,86,82,40,'Elite Midfielders'),
('Jude Bellingham','CM','Real Madrid','England',90,80,85,86,87,78,82,40,'Elite Midfielders'),
('Ousmane Dembélé','RW','Paris Saint-Germain','France',90,91,88,82,93,38,70,40,'Elite Attackers'),
('Lamine Yamal','RW','Barcelona','Spain',90,88,82,85,88,40,62,40,'Elite Attackers'),
('Gianluigi Donnarumma','GK','Manchester City','Italy',89,45,30,68,45,85,82,36,'Elite Goalkeepers'),
('Alisson Becker','GK','Liverpool','Brazil',89,42,28,70,44,84,80,36,'Elite Goalkeepers'),
('Thibaut Courtois','GK','Real Madrid','Belgium',89,40,28,66,42,86,85,36,'Elite Goalkeepers'),
('Achraf Hakimi','RB','Paris Saint-Germain','Morocco',89,92,75,80,85,82,75,36,'Elite Defenders'),
('Harry Kane','ST','Bayern Munich','England',89,78,93,83,85,48,83,36,'Elite Attackers'),
('Vitinha','CM','Paris Saint-Germain','Portugal',89,74,75,87,86,68,65,36,'Elite Midfielders'),
('Joshua Kimmich','CDM','Bayern Munich','Germany',88,68,72,89,80,82,75,32,'Elite Midfielders'),
('Viktor Gyökeres','ST','Sporting CP','Sweden',88,85,87,65,80,45,91,32,'Elite Attackers'),
('Alessandro Bastoni','CB','Inter Milan','Italy',87,75,55,78,78,88,80,28,'Elite Defenders'),
('Marquinhos','CB','Paris Saint-Germain','Brazil',87,76,50,76,75,89,80,28,'Elite Defenders'),
('Alexander Isak','ST','Newcastle United','Sweden',87,85,89,72,83,40,78,28,'Elite Attackers'),
('Bruno Fernandes','CAM','Manchester United','Portugal',87,72,84,89,83,62,72,28,'Elite Midfielders'),
('Rúben Dias','CB','Manchester City','Portugal',86,70,48,72,70,87,85,24,'Elite Defenders'),
('Trent Alexander-Arnold','RB','Real Madrid','England',86,78,68,89,80,75,68,24,'Elite Defenders'),
('Alphonso Davies','LB','Bayern Munich','Canada',84,94,66,78,85,74,76,16,'Elite Defenders'),
('Désiré Doué','RW','Paris Saint-Germain','France',85,83,80,82,90,35,64,20,'Elite Attackers'),
('Kobbie Mainoo','CM','Manchester United','England',84,75,70,80,80,72,70,16,'Wonderkids / Bargains'),
('Luka Vuskovic','CB','Hamburger SV','Croatia',78,65,35,65,60,78,80,8,'Wonderkids / Bargains'),
('Endrick','ST','Real Madrid (loan: Lyon)','Brazil',78,87,78,65,80,30,70,8,'Wonderkids / Bargains'),
('Rodrigo Mora','CAM','FC Porto','Portugal',77,77,74,75,80,35,60,7,'Wonderkids / Bargains'),
('Antonio Nusa','LW','RB Leipzig','Norway',76,88,70,68,78,30,65,6,'Wonderkids / Bargains'),
('James Trafford','GK','Manchester City','England',75,40,25,62,38,70,76,5,'Wonderkids / Bargains'),
('Leny Yoro','CB','Manchester United','France',78,78,40,68,65,78,78,8,'Wonderkids / Bargains'),
('Joaquín Seys','LB','Genk','Belgium',74,81,45,65,70,68,65,4,'Wonderkids / Bargains'),
('Francesco Camarda','ST','AC Milan','Italy',76,80,75,60,72,25,68,6,'Wonderkids / Bargains');

-- ---------- 30 FIXTURES (double round robin, 10 matchweeks x 3) ----------
-- Matchweeks 1-5 (first leg)
insert into fixtures (matchweek, home_club_id, away_club_id) values
(1,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006'),
(1,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005'),
(1,'00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'),
(2,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005'),
(2,'00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004'),
(2,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'),
(3,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004'),
(3,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003'),
(3,'00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002'),
(4,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'),
(4,'00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002'),
(4,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006'),
(5,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
(5,'00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006'),
(5,'00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005');

-- Matchweeks 6-10 (reverse fixtures — home/away swapped)
insert into fixtures (matchweek, home_club_id, away_club_id) values
(6,'00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001'),
(6,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002'),
(6,'00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003'),
(7,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001'),
(7,'00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000006'),
(7,'00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002'),
(8,'00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001'),
(8,'00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005'),
(8,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006'),
(9,'00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001'),
(9,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004'),
(9,'00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000005'),
(10,'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001'),
(10,'00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003'),
(10,'00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004');

-- ---------- AUCTION LOT ORDER ----------
-- Stadiums -> Managers -> Elite GKs -> Elite DEFs -> Elite MIDs ->
-- Elite ATTs -> Wonderkids/Bargains. Highest base price first
-- within each category (biggest lots draw the room in early).
insert into auction_lots (lot_order, item_type, item_id)
select row_number() over (order by ord, base_price desc) as lot_order, item_type, item_id
from (
  select 1 as ord, 'stadium'::text as item_type, id as item_id, base_price from stadiums
  union all
  select 2, 'manager', id, base_price from managers
  union all
  select 3, 'player', id, base_price from players where tier = 'Elite Goalkeepers'
  union all
  select 4, 'player', id, base_price from players where tier = 'Elite Defenders'
  union all
  select 5, 'player', id, base_price from players where tier = 'Elite Midfielders'
  union all
  select 6, 'player', id, base_price from players where tier = 'Elite Attackers'
  union all
  select 7, 'player', id, base_price from players where tier = 'Wonderkids / Bargains'
) t;

-- ---------- Sanity checks ----------
-- select count(*) from fixtures; -- expect 30
-- select count(*) from auction_lots; -- expect 10 + 5 + 35 = 50
-- select c.name, count(*) from fixtures f join clubs c on c.id in (f.home_club_id, f.away_club_id) group by c.name; -- expect 10 each
