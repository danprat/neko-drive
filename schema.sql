-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Files Table
-- Note: Removed UNIQUE constraint from name to support multi-user/folders
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    type TEXT,
    folder_id TEXT, -- Maps to folder path/ID
    iv TEXT, -- Global IV
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chunks Table
-- Linked to files via ON DELETE CASCADE (Automatic cleanup)
CREATE TABLE IF NOT EXISTS chunks (
    id BIGSERIAL PRIMARY KEY,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    url TEXT NOT NULL,
    iv TEXT, -- Per-chunk IV
    size BIGINT NOT NULL
);

-- 3. Atomic Save RPC (The "Smart" part)
-- This ensures a file and its chunks are saved in a single transaction.
-- The DELETE inside is TARGETED to only the specific file ID being saved.
CREATE OR REPLACE FUNCTION save_file_with_chunks(
    p_file_id UUID,
    p_name TEXT,
    p_size BIGINT,
    p_type TEXT,
    p_folder_id TEXT,
    p_iv TEXT,
    p_date TIMESTAMPTZ,
    p_chunks JSONB
) RETURNS VOID AS $$
BEGIN
    -- Upsert the file metadata
    INSERT INTO files (id, name, size, type, folder_id, iv, date)
    VALUES (p_file_id, p_name, p_size, p_type, p_folder_id, p_iv, COALESCE(p_date, NOW()))
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        size = EXCLUDED.size,
        type = EXCLUDED.type,
        folder_id = EXCLUDED.folder_id,
        iv = EXCLUDED.iv,
        date = EXCLUDED.date;

    -- Targeted cleanup: Only delete chunks for THIS specific file
    -- This prevents duplicate chunks if a re-upload happens.
    DELETE FROM chunks WHERE file_id = p_file_id;
    
    -- Bulk insert the new chunks
    INSERT INTO chunks (file_id, chunk_index, message_id, url, iv, size)
    SELECT 
        p_file_id, 
        (value->>'index')::INT, 
        value->>'messageId', 
        value->>'url', 
        value->>'iv', 
        (value->>'size')::BIGINT
    FROM jsonb_array_elements(p_chunks);
END;
$$ LANGUAGE plpgsql;

-- Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_id);
