'use client';
import Link from 'next/link';
import { FaUser, FaStore, FaTools, FaBriefcase } from 'react-icons/fa';

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-6"
      style={{
        backgroundImage: "url('https://copilot.microsoft.com/th/id/BCO.0eb9ccce-1341-4fef-a97b-9b7e1d8ee3df.png')",
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-lg w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">منصة شام للإعلانات</h1>
        <p className="text-center text-gray-700 mb-6">
          منصة مجانية تجمع الزوار، التجار، والمنتجين لعرض وطلب الخدمات والمنتجات بكل سهولة.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Link href="/visitor" className="group flex items-center gap-3 bg-blue-100 hover:bg-blue-200 p-4 rounded-lg shadow transition">
            <FaUser className="text-blue-600 text-xl group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-semibold">زائر</span>
          </Link>
          <Link href="/merchant" className="group flex items-center gap-3 bg-green-100 hover:bg-green-200 p-4 rounded-lg shadow transition">
            <FaStore className="text-green-600 text-xl group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-semibold">انشر اعلاناتك</span>
          </Link>
          <Link href="/producer" className="group flex items-center gap-3 bg-yellow-100 hover:bg-yellow-200 p-4 rounded-lg shadow transition">
            <FaTools className="text-yellow-600 text-xl group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-semibold">عضو منتِج</span>
          </Link>
          <Link href="/jobs" className="group flex items-center gap-3 bg-red-100 hover:bg-red-200 p-4 rounded-lg shadow transition">
            <FaBriefcase className="text-red-600 text-xl group-hover:scale-110 transition-transform" />
            <span className="text-gray-800 font-semibold">العمل</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/70 p-4 rounded shadow text-center">
            <h3 className="font-bold text-lg mb-2">انشر اعلاناتك باقل تكبفة</h3>
            <p className="text-sm text-gray-600">قم بالحصول على ارباح مباشرة</p>
          </div>
          <div className="bg-white/70 p-4 rounded shadow text-center">
            <h3 className="font-bold text-lg mb-2">أدوار متعددة</h3>
            <p className="text-sm text-gray-600">زائر، تاجر، منتِج، أو باحث عن عمل</p>
          </div>
          <div className="bg-white/70 p-4 rounded shadow text-center">
            <h3 className="font-bold text-lg mb-2">سهولة الاستخدام</h3>
            <p className="text-sm text-gray-600">واجهة بسيطة وسريعة على كل الأجهزة</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/visitor" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition">
            ابدأ الآن
          </Link>
        </div>
      </div>
    </main>
  );
}