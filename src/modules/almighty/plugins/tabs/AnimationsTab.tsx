export default function AnimationsTab() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-4">Animations placeholder</p>
      <div className="space-y-2">
        {['Animation 1', 'Animation 2', 'Animation 3'].map((name, i) => (
          <div key={i} className="p-3 bg-muted rounded-lg text-sm">{name}</div>
        ))}
      </div>
    </div>
  )
}
