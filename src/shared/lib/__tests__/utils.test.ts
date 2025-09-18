// Example unit test for utility functions
import { describe, expect, test } from 'vitest'
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  truncate,
  isEmail,
  isUrl,
  unique,
  groupBy
} from '../utils'

describe('formatCurrency', () => {
  test('formats USD currency correctly', () => {
    expect(formatCurrency(1299.99)).toBe('$1,299.99')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(5.50)).toBe('$5.50')
  })

  test('formats other currencies', () => {
    expect(formatCurrency(100, 'EUR')).toBe('€100.00')
  })
})

describe('formatDate', () => {
  test('formats dates correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const formatted = formatDate(date)
    expect(formatted).toMatch(/Jan \d+, 2024/)
  })
})

describe('truncate', () => {
  test('truncates long strings', () => {
    expect(truncate('This is a long string', 10)).toBe('This is a ...')
  })

  test('leaves short strings unchanged', () => {
    expect(truncate('Short', 10)).toBe('Short')
  })
})

describe('validation utilities', () => {
  test('isEmail validates email addresses', () => {
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('invalid-email')).toBe(false)
    expect(isEmail('user@')).toBe(false)
  })

  test('isUrl validates URLs', () => {
    expect(isUrl('https://example.com')).toBe(true)
    expect(isUrl('invalid-url')).toBe(false)
  })
})

describe('array utilities', () => {
  test('unique removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b'])
  })

  test('groupBy groups items correctly', () => {
    const items = [
      { type: 'fruit', name: 'apple' },
      { type: 'fruit', name: 'banana' },
      { type: 'vegetable', name: 'carrot' }
    ]
    
    const grouped = groupBy(items, item => item.type)
    
    expect(grouped.fruit).toHaveLength(2)
    expect(grouped.vegetable).toHaveLength(1)
    expect(grouped.fruit[0].name).toBe('apple')
  })
})