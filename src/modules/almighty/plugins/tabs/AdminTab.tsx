export default function AdminTab() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-4">Admin controls placeholder</p>
      <div className="space-y-2">
        {['Setting 1', 'Setting 2', 'Setting 3'].map((name, i) => (
          <div key={i} className="p-3 bg-muted rounded-lg text-sm">{name}</div>
        ))}
      </div>
    </div>
  )
}
