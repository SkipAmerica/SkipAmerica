// Type definitions for mux-player web component
declare namespace JSX {
  interface IntrinsicElements {
    'mux-player': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'stream-type'?: 'on-demand' | 'live'
        'playback-id'?: string
        muted?: boolean
        autoplay?: boolean
        loop?: boolean
        playsInline?: boolean
        controls?: boolean
        style?: React.CSSProperties
      },
      HTMLElement
    >
  }
}
