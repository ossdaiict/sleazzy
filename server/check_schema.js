const { supabase } = require('./dist/supabaseClient');
supabase.from('bookings').select('*').limit(1).then(({ data, error }) => {
  if (error) console.error(error);
  else console.log('Keys:', data.length > 0 ? Object.keys(data[0]) : 'Table empty or no rows');
});
