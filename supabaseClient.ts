
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apsvolgmsuvsjptxehaa.supabase.co';
const supabaseAnonKey = 'sb_publishable_sH1nNr3uasy6xvnUfSgz4g_qlPbGZzY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
