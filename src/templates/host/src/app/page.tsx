import dynamic from 'next/dynamic';

// Dynamic imports will be added based on remotes configuration
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Host Application</h1>
      {/* Remote components will be rendered here */}
    </main>
  );
} 