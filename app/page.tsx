'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/**
 * Dynamic icon loader that returns a React component typed as an SVG component.
 * We wrap the named export from react-icons in a small functional component so
 * Next's dynamic loader receives a proper component constructor.
 *
 * This avoids the TypeScript mismatch between the dynamic loader signature
 * and the various export shapes from react-icons.
 */
const loadFaUser = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaUser as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaStore = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaStore as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaTools = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaTools as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaBriefcase = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaBriefcase as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const FaUser = dynamic(loadFaUser, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaStore = dynamic(loadFaStore, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaTools = dynamic(loadFaTools, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaBriefcase = dynamic(loadFaBriefcase, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

export default function HomePage() {
  const bgUrl =
    '/bg.jpg'; // recommended: place a background image in public/bg.jpg for reliable loading

  return (
    <main
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-6"
      style={{
        backgroundImage: `url("${bgUrl}")`,
        backgroundColor: '#0f172a',
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">منصة تجار للإعلانات</h1>

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
            href="/merchant"
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