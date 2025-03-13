-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    channel TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL
);

-- Set up row-level security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous users
CREATE POLICY "Allow read access to messages" ON public.messages
    FOR SELECT
    USING (true);

-- Allow insert access to all authenticated and anonymous users (for this demo)
-- In a production app, you might want to restrict this to authenticated users
CREATE POLICY "Allow insert access to messages" ON public.messages
    FOR INSERT
    WITH CHECK (true);

-- Set up realtime subscription on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;