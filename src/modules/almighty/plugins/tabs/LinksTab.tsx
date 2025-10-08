export default function LinksTab() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-4">Links & Notes placeholder</p>
      <div className="space-y-2">
        {['Link 1', 'Link 2', 'Note 1'].map((name, i) => (
          <div key={i} className="p-3 bg-muted rounded-lg text-sm">{name}</div>
        ))}
      </div>
    </div>
  )
}
