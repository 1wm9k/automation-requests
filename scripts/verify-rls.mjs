import { createClient } from '@supabase/supabase-js'
const e=process.env; const url=e.SUPABASE_URL, key=e.SUPABASE_ANON_KEY
if(!url||!key){console.log('SKIP: set SUPABASE_URL and SUPABASE_ANON_KEY plus test credentials');process.exit(0)}
const ok=(name,v)=>console.log(`${v?'PASS':'FAIL'} ${name}`)
const a=createClient(url,key),b=createClient(url,key)
const sign=async(c,email,password)=>{let r=await c.auth.signInWithPassword({email,password});if(r.error)r=await c.auth.signUp({email,password});return r}
const ar=await sign(a,e.TEST_A_EMAIL,e.TEST_A_PASSWORD),br=await sign(b,e.TEST_B_EMAIL,e.TEST_B_PASSWORD)
if(ar.error||br.error){console.error(ar.error||br.error);process.exit(1)}
const uid=ar.data.user.id,id=crypto.randomUUID();const ins=await a.from('tickets').insert({id,title:'RLS test',description:'Private',category:'Бот'}).select().single();ok('A creates ticket',!ins.error)
const read=await b.from('tickets').select().eq('id',id);ok('B cannot read A ticket',!read.data?.length)
const upd=await b.from('tickets').update({title:'hack'}).eq('id',id);ok('B cannot update A ticket',upd.error||upd.count===0)
const del=await b.from('tickets').delete().eq('id',id);ok('B cannot delete A ticket',del.error||del.count===0)
const foreign=await b.from('tickets').insert({id:crypto.randomUUID(),user_id:uid,title:'hack',description:'hack',category:'Бот'});ok('B cannot insert foreign user_id',!!foreign.error)
const own=await a.from('tickets').update({user_id:crypto.randomUUID()}).eq('id',id);ok('A cannot change user_id',!!own.error)
const bad=await a.from('tickets').insert({id:crypto.randomUUID(),title:'x',description:'x',category:'bad'});ok('Invalid category rejected',!!bad.error)
await a.from('tickets').delete().eq('id',id)
