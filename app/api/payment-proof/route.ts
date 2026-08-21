import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime='nodejs';

export async function POST(req:Request){
  const supabase=getSupabaseAdmin();
  if(!supabase)return NextResponse.json({error:'Supabase is not configured; checkout will use local demo storage.'},{status:503});
  const data=await req.formData();
  const file=data.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Image file required'},{status:400});
  if(!file.type.startsWith('image/')||file.size>5*1024*1024)return NextResponse.json({error:'Use an image up to 5MB'},{status:400});
  const ext=file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g,'')||'jpg';
  const path=`${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
  const bytes=await file.arrayBuffer();
  const {error}=await supabase.storage.from('payment-proofs').upload(path,bytes,{contentType:file.type,upsert:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({path});
}
