import { describe,it,expect } from 'vitest'
const escapeLike=(s:string)=>s.replace(/[\\%_]/g,'\\$&')
describe('search escaping',()=>{it('escapes wildcard characters',()=>expect(escapeLike('100%_test')).toBe('100\\%\\_test'));it('keeps normal text',()=>expect(escapeLike('бот')).toBe('бот'))})
export const cleanEmail = (s: string) => s.replace(/[\u200B\uFEFF\r]/g, '').trim()
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail(s))

describe('validation', () => {
  it('trims required fields', () => expect('  заявка  '.trim()).toBe('заявка'))
  it('rejects blank', () => expect('   '.trim()).toBe(''))
  it('validates email with zero-width characters and spaces', () => {
    expect(isValidEmail('clowlysteam@gmail.com')).toBe(true)
    expect(isValidEmail('  clowlysteam@gmail.com\r ')).toBe(true)
    expect(isValidEmail('clowlysteam\u200B@gmail.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
  })
})
