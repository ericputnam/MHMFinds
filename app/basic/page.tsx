export default function BasicPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Basic Test Page</h1>
      <p>This is a basic test page.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}
