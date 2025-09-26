/**
 * A reusable class for managing draggable bottom panels
 * Handles all the drag logic, positioning, and state management
 */

export interface DraggableBottomPanelOptions {
  /** Height percentage of viewport when fully open (0-1) */
  openHeightRatio?: number
  /** Minimum handle height in pixels */
  minHandleHeight?: number
  /** Snap threshold as percentage of collapsed distance (0-1) */
  snapThreshold?: number
}

export interface PanelState {
  openHeightPx: number
  collapsedOffset: number
  panelOffset: number
  isDragging: boolean
  isOpen: boolean
}

export class DraggableBottomPanel {
  private element: HTMLElement | null = null
  private handleElement: HTMLElement | null = null
  private state: PanelState = {
    openHeightPx: 0,
    collapsedOffset: 0,
    panelOffset: 0,
    isDragging: false,
    isOpen: false
  }
  
  private dragState = {
    startY: 0,
    startOffset: 0,
    pointerId: -1
  }
  
  private resizeObserver: ResizeObserver | null = null
  private options: Required<DraggableBottomPanelOptions>
  private onStateChange?: (state: PanelState) => void
  
  constructor(options: DraggableBottomPanelOptions = {}) {
    this.options = {
      openHeightRatio: 0.6,
      minHandleHeight: 140,
      snapThreshold: 0.5,
      ...options
    }
    
    this.handleResize = this.handleResize.bind(this)
    this.handlePointerDown = this.handlePointerDown.bind(this)
    this.handlePointerMove = this.handlePointerMove.bind(this)
    this.handlePointerUp = this.handlePointerUp.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }
  
  /** Initialize the panel with DOM elements */
  initialize(panelElement: HTMLElement, handleElement: HTMLElement, onStateChange?: (state: PanelState) => void) {
    this.element = panelElement
    this.handleElement = handleElement
    this.onStateChange = onStateChange
    
    this.setupEventListeners()
    this.updateDimensions()
    this.startCollapsed()
  }
  
  /** Clean up event listeners */
  destroy() {
    this.removeEventListeners()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }
  
  /** Get current panel state */
  getState(): PanelState {
    return { ...this.state }
  }
  
  /** Toggle panel open/closed */
  toggle() {
    this.setState({
      panelOffset: this.state.isOpen ? this.state.collapsedOffset : 0,
      isOpen: !this.state.isOpen
    })
  }
  
  /** Open the panel */
  open() {
    this.setState({
      panelOffset: 0,
      isOpen: true
    })
  }
  
  /** Close/collapse the panel */
  close() {
    this.setState({
      panelOffset: this.state.collapsedOffset,
      isOpen: false
    })
  }
  
  private setupEventListeners() {
    if (!this.handleElement) return
    
    this.handleElement.addEventListener('pointerdown', this.handlePointerDown)
    this.handleElement.addEventListener('click', this.handleClick)
    window.addEventListener('resize', this.handleResize)
    
    // Set up ResizeObserver for handle size changes
    if ('ResizeObserver' in window && this.handleElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateDimensions()
      })
      this.resizeObserver.observe(this.handleElement)
    }
  }
  
  private removeEventListeners() {
    if (this.handleElement) {
      this.handleElement.removeEventListener('pointerdown', this.handlePointerDown)
      this.handleElement.removeEventListener('click', this.handleClick)
    }
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('pointermove', this.handlePointerMove)
    document.removeEventListener('pointerup', this.handlePointerUp)
    document.removeEventListener('pointercancel', this.handlePointerUp)
  }
  
  private updateDimensions() {
    const openHeightPx = Math.round(window.innerHeight * this.options.openHeightRatio)
    const handleHeight = this.handleElement?.offsetHeight || this.options.minHandleHeight
    const collapsedOffset = Math.max(0, openHeightPx - handleHeight)
    
    this.setState({
      openHeightPx,
      collapsedOffset,
      // Ensure panel stays within bounds
      panelOffset: Math.min(this.state.panelOffset, collapsedOffset)
    })
  }
  
  private startCollapsed() {
    this.setState({
      panelOffset: this.state.collapsedOffset,
      isOpen: false
    })
  }
  
  private setState(updates: Partial<PanelState>) {
    this.state = { ...this.state, ...updates }
    
    // Update DOM
    if (this.element) {
      this.element.style.transform = `translateY(${this.state.panelOffset}px)`
    }
    
    // Notify listeners
    if (this.onStateChange) {
      this.onStateChange(this.state)
    }
  }
  
  private handleResize() {
    this.updateDimensions()
  }
  
  private handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return // Only left click
    
    this.dragState = {
      startY: e.clientY,
      startOffset: this.state.panelOffset,
      pointerId: e.pointerId
    }
    
    this.setState({ isDragging: true })
    
    // Capture pointer and set up document listeners
    if (this.handleElement) {
      this.handleElement.setPointerCapture(e.pointerId)
    }
    
    document.addEventListener('pointermove', this.handlePointerMove)
    document.addEventListener('pointerup', this.handlePointerUp)
    document.addEventListener('pointercancel', this.handlePointerUp)
    
    e.preventDefault()
  }
  
  private handlePointerMove(e: PointerEvent) {
    if (!this.state.isDragging || e.pointerId !== this.dragState.pointerId) return
    
    const deltaY = e.clientY - this.dragState.startY
    const newOffset = Math.max(0, Math.min(
      this.dragState.startOffset + deltaY,
      this.state.collapsedOffset
    ))
    
    this.setState({ panelOffset: newOffset })
  }
  
  private handlePointerUp(e: PointerEvent) {
    if (!this.state.isDragging || e.pointerId !== this.dragState.pointerId) return
    
    // Snap to open or closed based on threshold
    const threshold = this.state.collapsedOffset * this.options.snapThreshold
    const shouldOpen = this.state.panelOffset < threshold
    
    this.setState({
      isDragging: false,
      panelOffset: shouldOpen ? 0 : this.state.collapsedOffset,
      isOpen: shouldOpen
    })
    
    // Clean up event listeners
    document.removeEventListener('pointermove', this.handlePointerMove)
    document.removeEventListener('pointerup', this.handlePointerUp)
    document.removeEventListener('pointercancel', this.handlePointerUp)
    
    // Release pointer capture
    if (this.handleElement) {
      try {
        this.handleElement.releasePointerCapture(e.pointerId)
      } catch {
        // Ignore errors if capture was already released
      }
    }
  }
  
  private handleClick(e: MouseEvent) {
    // Only handle click if we weren't dragging
    if (this.state.isDragging) return
    
    this.toggle()
    e.preventDefault()
  }
}