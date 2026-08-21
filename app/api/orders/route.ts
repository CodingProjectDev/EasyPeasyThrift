import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req:Request){
  const supabase=getSupabaseAdmin();
  if(!supabase)return NextResponse.json({error:'Supabase is not configured; checkout will use local demo storage.'},{status:503});
  const body=await req.json();
  if(!Array.isArray(body.items)||!body.items.length)return NextResponse.json({error:'Order items required'},{status:400});
  if(!['COD','QR'].includes(body.paymentMethod))return NextResponse.json({error:'Unsupported payment method'},{status:400});
  if(body.paymentMethod==='QR'&&(!body.transactionId||!body.paymentProofPath))return NextResponse.json({error:'QR payment requires proof and transaction ID'},{status:400});
  const items=body.items.map((i:{productId:string;quantity:number})=>({product_id:i.productId,quantity:Number(i.quantity)}));
  const {data,error}=await supabase.rpc('place_order',{p_customer_id:null,p_email:body.customer.email,p_full_name:body.customer.name,p_phone:body.customer.phone,p_address:body.customer.address,p_city:body.customer.city,p_postal_code:body.customer.postalCode,p_payment_method:body.paymentMethod,p_transaction_id:body.transactionId||null,p_payment_proof_path:body.paymentProofPath||null,p_promo_code:body.promoCode||null,p_items:items});
  if(error)return NextResponse.json({error:error.message},{status:409});
  return NextResponse.json({orderId:data});
}
