-- Add reparatur_status column for sub-status within Reparatur returns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reparatur_status TEXT;

-- Update the CHECK constraint on status to include 'reparatur'
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
    'reparatur'
  )
);
