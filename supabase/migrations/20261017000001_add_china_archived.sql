ALTER TABLE china_bestellungen ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE china_bestellungen ALTER COLUMN archived SET DEFAULT false;
