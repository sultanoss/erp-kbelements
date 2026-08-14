CREATE TABLE IF NOT EXISTS geplante_bestellungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fabrik TEXT,
  datum DATE NOT NULL,
  notiz TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geplante_bestellungen_artikel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestellung_id UUID NOT NULL REFERENCES geplante_bestellungen(id) ON DELETE CASCADE,
  artikel TEXT NOT NULL,
  anzahl INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE geplante_bestellungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE geplante_bestellungen_artikel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select" ON geplante_bestellungen FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert" ON geplante_bestellungen FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth update" ON geplante_bestellungen FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth delete" ON geplante_bestellungen FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "auth select art" ON geplante_bestellungen_artikel FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert art" ON geplante_bestellungen_artikel FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth update art" ON geplante_bestellungen_artikel FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth delete art" ON geplante_bestellungen_artikel FOR DELETE USING (auth.role() = 'authenticated');
