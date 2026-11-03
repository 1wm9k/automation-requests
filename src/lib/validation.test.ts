import { describe,it,expect } from 'vitest'
const escapeLike=(s:string)=>s.replace(/[\\%_]/g,'\\$&')
describe('search escaping',()=>{it('escapes wildcard characters',()=>expect(escapeLike('100%_test')).toBe('100\\%\\_test'));it('keeps normal text',()=>expect(escapeLike('бот')).toBe('бот'))})
describe('validation',()=>{it('trims required fields',()=>expect('  заявка  '.trim()).toBe('заявка'));it('rejects blank',()=>expect('   '.trim()).toBe(''))})
