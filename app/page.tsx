'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/**
 * نحمّل أيقونات react-icons ديناميكيًا مع تعطيل SSR لتجنّب مشاكل النوع أثناء البناء/SSR.
 * نصرّف النوع كـ React.ComponentType<React.SVGProps<SVGSVGElement>> لتوافق مع JSX SVG props.
 */
const FaUser = dynamic(
  () => import('react-icons/fa').then((mod) => mod.FaUser),
  { ssr: false }
) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

const FaStore = dynamic(
  () => import('react-icons/fa').then((mod) => mod.FaStore),
  { ssr: false }
) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

const FaTools = dynamic(
  () => import('react-icons/fa').then((mod) => mod.FaTools),
  { ssr: false }
) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

const FaBriefcase = dynamic(
  () => import('react-icons/fa').then((mod) => mod.FaBriefcase),
  { ssr: false }
) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

export default function HomePage() {
  // رابط الخلفية — إن كان لديك صورة داخلية في المشروع استخدم مسار محلي بدلاً من URL خارجي
  const bgUrl =
    'https://copilot.microsoft.com/th/id/BCO.0eb9ccce-1341-4fef-a97b-9b7e1d8ee3df.png';

  return (
    <main
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-6"
      style={{
        // استخدم قالب سلسلة للتأكد من أن القيمة صحيحة
        backgroundImage: `url("${bgUrl}")`,
        // لون احتياطي في حال لم تُحمّل الصورة
        backgroundColor: '#0f172a',
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">منصة تجار للإعلانات</h1>

        {/* زر جديد لإنشاء صفحة */}
        <div className="flex justify-center mb-4">
          <Link
            href="/create-page"
            className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md shadow"
          >
            إنشاء صفحة جديدة
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/search"
            className="group flex items-center gap-3 bg-blue-100 hover:bg-blue-200 p-4 rounded-lg shadow transition"
          >
            <span className="text-blue-600 text-xl group-hover:scale-110 transition-transform">
              <FaUser />
            </span>
            <span className="text-gray-800 font-semibold">زائر</span>
          </Link>

          <Link
            href="/Merchant"
            className="group flex items-center gap-3 bg-green-100 hover:bg-green-200 p-4 rounded-lg shadow transition"
          >
            <span className="text-green-600 text-xl group-hover:scale-110 transition-transform">
              <FaStore />
            </span>
            <span className="text-gray-800 font-semibold">انشر اعلاناتك</span>
          </Link>

          <Link
            href="/auth/login"
            className="group flex items-center gap-3 bg-yellow-100 hover:bg-yellow-200 p-4 rounded-lg shadow transition"
          >
            <span className="text-yellow-600 text-xl group-hover:scale-110 transition-transform">
              <FaTools />
            </span>
            <span className="text-gray-800 font-semibold">عضو منتِج</span>
          </Link>

          <Link
            href="/work"
            className="group flex items-center gap-3 bg-red-100 hover:bg-red-200 p-4 rounded-lg shadow transition"
          >
            <span className="text-red-600 text-xl group-hover:scale-110 transition-transform">
              <FaBriefcase />
            </span>
            <span className="text-gray-800 font-semibold">العمل</span>
          </Link>
        </div>
      </div>
    </main>
  );
}