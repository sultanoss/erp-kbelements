-- Add 'bei_reparatur' to the returns status check constraint
DO $$
DECLARE
  cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name = 'returns'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%status%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE returns DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE returns ADD CONSTRAINT returns_status_check CHECK (
  status IN (
    'eingegangen',
    'in_bearbeitung',
    'erledigt',
    'nicht_zustellbar',
    'wieder_an_kunde',
    'klaeren_mit_kunde',
    'garantie',
    'austausch',
    'warte_auf_kunde_antwort',
    'reparatur',
    'bei_reparatur'
  )
);
