'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center">منصة شام للإعلانات</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <Link href="/visitor" className="bg-blue-500 text-white p-4 rounded text-center hover:bg-blue-600">زائر</Link>
        <Link href="/merchant" className="bg-green-500 text-white p-4 rounded text-center hover:bg-green-600">تاجر</Link>
        <Link href="/producer" className="bg-yellow-500 text-white p-4 rounded text-center hover:bg-yellow-600">عضو منتِج</Link>
        <Link href="/jobs" className="bg-red-500 text-white p-4 rounded text-center hover:bg-red-600">العمل</Link>
      </div>
    </main>
  );
}