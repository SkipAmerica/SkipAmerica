import React from 'react';

type Props = {
  title?: string;
  rows: Array<[label: string, value: React.ReactNode]>;
  bottomLeft?: Array<[string, React.ReactNode]>;
};

export default function DebugHUD({ title = 'PQ Debug', rows, bottomLeft }: Props) {
  return (
    <>
      <div style={{
        position: 'fixed', top: 8, right: 8, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12, lineHeight: 1.35, padding: '10px 12px', borderRadius: 8,
        maxWidth: 360, pointerEvents: 'none', whiteSpace: 'pre-wrap'
      }}>
        <div style={{fontWeight: 700, marginBottom: 6}}>{title}</div>
        {rows.map(([k,v], i) => (
          <div key={i} style={{opacity: 0.95}}>
            <span style={{color:'#9ae6b4'}}>{k}:</span> {v}
          </div>
        ))}
      </div>

      {bottomLeft && bottomLeft.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', color: '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12, lineHeight: 1.35, padding: '8px 10px', borderRadius: 8,
          maxWidth: 420, pointerEvents: 'none', whiteSpace: 'pre-wrap'
        }}>
          {bottomLeft.map(([k,v], i) => (
            <div key={i} style={{opacity: 0.95}}>
              <span style={{color:'#90cdf4'}}>{k}:</span> {v}
            </div>
          ))}
        </div>
      )}
    </>
  );
}