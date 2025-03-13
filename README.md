# Agora Web Quickstart with Supabase Chat

This project demonstrates how to build a live streaming application with real-time chat using Agora RTC SDK for streaming and Supabase for chat functionality.

## Features

- Live video streaming with host and audience roles
- Real-time chat between stream participants
- Persistent chat history
- Simple, intuitive user interface

## Setup

### Prerequisites

1. Node.js and npm installed
2. An Agora account and project
3. A Supabase account and project

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/agora_web_quickstart.git
cd agora_web_quickstart
```

2. Install dependencies
```
npm install
```

3. Set up Supabase database

a. Create a new table called `messages` in your Supabase project:
   - Go to the SQL Editor and execute the SQL below
   - Alternatively, use the included `messages-table.sql` file

```sql
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

-- Allow insert access to all authenticated and anonymous users
CREATE POLICY "Allow insert access to messages" ON public.messages
    FOR INSERT
    WITH CHECK (true);

-- Set up realtime subscription on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

b. **Enable Realtime for the messages table**:
   - Go to your Supabase dashboard → Database → Realtime
   - Make sure the messages table is enabled for realtime updates
   - If not, enable it by toggling it on

4. Update environment variables

Create a `.env` file in the root directory with the following content:

```
VITE_AGORA_APP_ID=your-agora-app-id
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-supabase-anon-key
```

For Supabase, you can find these values in your Supabase project dashboard under Settings → API.

5. Run the application
```
npm run dev
```

## Usage

1. Enter a stream name in the input field
2. Click "Join as host" to start streaming or "Join as audience" to watch
3. Enter your name in the chat panel
4. Type messages in the chat input and click "Send" or press Enter
5. Click "Leave" to exit the stream

## Configuration

### Agora Configuration

For production use, you'll need to generate and use tokens for secure authentication. Update the `getTemporaryToken` function in `main.js` to implement token-based authentication.

### Supabase Configuration

The Supabase URL and key are already configured to use environment variables. Make sure your `.env` file includes both `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` values.

For production applications, consider implementing additional security measures:
- Use Row Level Security rules to restrict access based on user authentication
- Create and use service roles with limited permissions for specific operations
- Set up proper CORS configuration in your Supabase project settings

## License

[MIT](LICENSE)