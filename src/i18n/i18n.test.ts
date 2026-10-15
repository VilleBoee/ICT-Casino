import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fi } from './fi'
import { translate } from './index'
import { errorText } from './errors'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n dictionaries', () => {
  it('every key exists in both languages, with no extras', () => {
    expect(Object.keys(fi).sort()).toEqual(Object.keys(en).sort())
  })
  it('no empty strings, and the same {placeholders} in both', () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[k].trim(), k).not.toBe('')
      expect(fi[k].trim(), k).not.toBe('')
      expect(placeholders(fi[k]), k).toEqual(placeholders(en[k]))
    }
  })
  it('interpolates and switches language', () => {
    expect(translate('en', 'top.balance', { n: 5 })).toBe('Balance: 5 chips')
    expect(translate('fi', 'top.balance', { n: 5 })).toBe('Saldo: 5 pelimerkkiä')
    expect(translate('fi', 'bj.stand')).toBe('Jää')
  })
  it('maps engine errors to translated text, falling back to the original', () => {
    const t = (k: keyof typeof en, v?: Record<string, string | number>) => translate('fi', k, v)
    expect(errorText(new Error('Insufficient balance'), t)).toBe('Pelimerkit eivät riitä')
    expect(errorText(new Error('Raise must be between 40 and 975'), t)).toBe('Korotuksen on oltava välillä 40–975')
    expect(errorText(new Error('Something odd'), t)).toBe('Something odd')
  })
})
