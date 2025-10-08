export default function FilesTab() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-4">Files placeholder</p>
      <div className="space-y-2">
        {['Document.pdf', 'Image.png', 'Video.mp4'].map(name => (
          <div key={name} className="p-3 bg-muted rounded-lg text-sm">{name}</div>
        ))}
      </div>
    </div>
  )
}
