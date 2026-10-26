import fs from 'fs';

const content = fs.readFileSync('src/context/MedhaContext.tsx', 'utf-8');

const target = `    const syncUserLocally = (session: any) => {`;
const replacement = `    const syncUserLocally = async (session: any) => {
      if (session?.user && supabase) {
        // Collect data and store in supabase
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
        const role = session.user.user_metadata?.role || 'patient';
        
        // Upsert user into a 'users' or 'profiles' table in Supabase if needed
        // Assuming there is a users table. To be safe, we'll try to upsert.
        try {
          await supabase.from('users').upsert({ 
            id: session.user.id, 
            email: email, 
            name: name, 
            role: role 
          }, { onConflict: 'id' });
        } catch (e) {
          console.warn('Could not store user in Supabase users table:', e);
        }
`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/context/MedhaContext.tsx', updated);
