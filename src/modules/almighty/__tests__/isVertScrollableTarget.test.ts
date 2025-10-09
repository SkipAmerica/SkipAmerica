import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock implementation for testing
function isVertScrollableTarget(target: HTMLElement): boolean {
  let el: HTMLElement | null = target

  while (el && el !== document.body) {
    const style = window.getComputedStyle(el)
    const isScrollable = ['auto', 'scroll'].includes(style.overflowY)

    if (isScrollable && el.scrollHeight > el.clientHeight) {
      const canScrollUp = el.scrollTop > 0
      const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight

      if (canScrollUp || canScrollDown) {
        return true
      }
    }

    el = el.parentElement
  }

  return false
}

describe('isVertScrollableTarget', () => {
  let container: HTMLDivElement
  let scrollableChild: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('should return false for non-scrollable element', () => {
    const div = document.createElement('div')
    container.appendChild(div)
    expect(isVertScrollableTarget(div)).toBe(false)
  })

  it('should return true for scrollable element with overflow', () => {
    const div = document.createElement('div')
    div.style.overflowY = 'auto'
    div.style.height = '100px'
    div.innerHTML = '<div style="height: 300px;">Content</div>'
    container.appendChild(div)
    
    // Simulate scroll position
    Object.defineProperty(div, 'scrollHeight', { value: 300, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(div, 'scrollTop', { value: 50, configurable: true })

    expect(isVertScrollableTarget(div)).toBe(true)
  })

  it('should check parent elements recursively', () => {
    const outer = document.createElement('div')
    outer.style.overflowY = 'scroll'
    outer.style.height = '100px'
    
    const inner = document.createElement('div')
    inner.style.height = '300px'
    
    outer.appendChild(inner)
    container.appendChild(outer)

    // Simulate scrollable outer
    Object.defineProperty(outer, 'scrollHeight', { value: 300, configurable: true })
    Object.defineProperty(outer, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(outer, 'scrollTop', { value: 10, configurable: true })

    expect(isVertScrollableTarget(inner)).toBe(true)
  })
})
