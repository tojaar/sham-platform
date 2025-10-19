'use client';
import Link from 'next/link';
import { FaUser, FaStore, FaTools, FaBriefcase } from 'react-icons/fa';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-800">منصة شام للإعلانات</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <Link href="/visitor" className="group flex items-center gap-4 bg-white shadow-md rounded-lg p-4 hover:bg-blue-100 transition">
          <FaUser className="text-blue-500 text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-gray-700">زائر</span>
        </Link>

        <Link href="/merchant" className="group flex items-center gap-4 bg-white shadow-md rounded-lg p-4 hover:bg-green-100 transition">
          <FaStore className="text-green-500 text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-gray-700">نشر اعلاناتك</span>
        </Link>

        <Link href="/producer" className="group flex items-center gap-4 bg-white shadow-md rounded-lg p-4 hover:bg-yellow-100 transition">
          <FaTools className="text-yellow-500 text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-gray-700">عضو منتِج</span>
        </Link>

        <Link href="/jobs" className="group flex items-center gap-4 bg-white shadow-md rounded-lg p-4 hover:bg-red-100 transition">
          <FaBriefcase className="text-red-500 text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-gray-700">العمل</span>
        </Link>
      </div>
    </main>
  );
}