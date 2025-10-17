// Performance monitoring utilities

export function markPerformance(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name)
  }
}

export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0]
      
      if (import.meta.env.DEV && measure && measure.duration > 100) {
        console.warn(`[Performance] ${name} took ${measure.duration.toFixed(2)}ms`)
      }
      
      return measure?.duration
    } catch (e) {
      // Marks might not exist
    }
  }
}

export function logRenderCount(componentName: string) {
  if (!import.meta.env.DEV) return
  
  const key = `render-count-${componentName}`
  const count = ((window as any)[key] || 0) + 1
  ;(window as any)[key] = count
  
  if (count > 10) {
    console.warn(`[Performance] ${componentName} has rendered ${count} times`)
  }
}

export function clearPerformanceMarks() {
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks()
    performance.clearMeasures()
  }
}

// Analytics helper for production
export function trackPerformanceMetric(metricName: string, value: number, metadata?: Record<string, any>) {
  // In production, this would send to your analytics service
  if (!import.meta.env.DEV) {
    // Example: analytics.track('performance', { metric: metricName, value, ...metadata })
  }
}
