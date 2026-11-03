import { createClient } from '@supabase/supabase-js'

const e = process.env
const url = e.SUPABASE_URL
const key = e.SUPABASE_ANON_KEY

if (!url || !key) {
  console.log('SKIP: set SUPABASE_URL and SUPABASE_ANON_KEY plus test credentials')
  process.exit(0)
}

const ok = (name, v) => console.log(`${v ? 'PASS' : 'FAIL'} ${name}`)

const a = createClient(url, key)
const b = createClient(url, key)
const anon = createClient(url, key)

const sign = async (c, email, password) => {
  let r = await c.auth.signInWithPassword({ email, password })
  if (r.error) r = await c.auth.signUp({ email, password })
  return r
}

const ar = await sign(a, e.TEST_A_EMAIL, e.TEST_A_PASSWORD)
const br = await sign(b, e.TEST_B_EMAIL, e.TEST_B_PASSWORD)

if (ar.error || br.error) {
  console.error(ar.error || br.error)
  process.exit(1)
}

const uid = ar.data.user.id
const id = crypto.randomUUID()

// 1. Anon client cannot read tickets
const anonRead = await anon.from('tickets').select()
ok('Anon client cannot read tickets', !anonRead.data?.length)

// 2. User A creates ticket
const ins = await a
  .from('tickets')
  .insert({ id, title: 'RLS test', description: 'Private', category: 'Бот' })
  .select()
  .single()
if (ins.error) console.log('A create error:', ins.error.message)
ok('A creates ticket', !ins.error)

// 3. User B cannot read A ticket
const read = await b.from('tickets').select().eq('id', id)
ok('B cannot read A ticket', !read.data?.length)

// 4. User B cannot update A ticket
const upd = await b.from('tickets').update({ title: 'hack' }, { count: 'exact' }).eq('id', id)
ok('B cannot update A ticket', !!upd.error || upd.count === 0)

// 5. User B cannot delete A ticket
const del = await b.from('tickets').delete({ count: 'exact' }).eq('id', id)
ok('B cannot delete A ticket', !!del.error || del.count === 0)

// 6. User B cannot insert foreign user_id
const foreign = await b.from('tickets').insert({
  id: crypto.randomUUID(),
  user_id: uid,
  title: 'hack',
  description: 'hack',
  category: 'Бот',
})
ok('B cannot insert foreign user_id', !!foreign.error)

// 7. User A cannot change user_id
const own = await a.from('tickets').update({ user_id: crypto.randomUUID() }).eq('id', id).select().single()
ok('A cannot change user_id', !!own.error || own.data?.user_id === uid)

// 8. Invalid category rejected
const badCat = await a.from('tickets').insert({
  id: crypto.randomUUID(),
  title: 'x',
  description: 'x',
  category: 'bad',
})
ok('Invalid category rejected', !!badCat.error)

// 9. Invalid status rejected
const badStat = await a.from('tickets').insert({
  id: crypto.randomUUID(),
  title: 'x',
  description: 'x',
  status: 'bad',
})
ok('Invalid status rejected', !!badStat.error)

// Cleanup
await a.from('tickets').delete().eq('id', id)
