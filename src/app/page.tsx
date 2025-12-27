import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  
  // Fetch from YOUR table instead of "todos"
  const { data: media } = await supabase.from('media').select()
  
  return (
    <ul>
      {media?.map((item) => (
        <li key={item.id}>{item.source} - {item.media_type}</li>
      ))}
    </ul>
  )
}