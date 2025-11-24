-- Adiciona campos de coordenadas geográficas à tabela needs
ALTER TABLE needs 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Comentários para documentação
COMMENT ON COLUMN needs.latitude IS 'Latitude da localização do serviço';
COMMENT ON COLUMN needs.longitude IS 'Longitude da localização do serviço';

-- Criar índice para melhorar performance em buscas geográficas
CREATE INDEX IF NOT EXISTS idx_needs_coordinates ON needs(latitude, longitude);
