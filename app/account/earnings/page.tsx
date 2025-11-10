// app/account/earnings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

type LadderRow = {
  level: number;
  percentage: number;
  description?: string;
};

export default function EarningsPage() {
  const [rows, setRows] = useState<LadderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLadder();
  }, []);

  async function fetchLadder() {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/earnings'); // سننشئ المسار أدناه
      const j = await resp.json();
      if (resp.ok && Array.isArray(j.rows)) setRows(j.rows);
      else setRows([
        { level: 1, percentage: 10, description: 'مستوى 1 مثال' },
        { level: 2, percentage: 5, description: 'مستوى 2 مثال' },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 min-h-screen bg-[#020718] text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">سلم الأرباح</h1>
        {loading ? <div>جاري التحميل...</div> : (
          <table className="w-full bg-[#041018] rounded">
            <thead>
              <tr>
                <th className="p-2 text-left">المستوى</th>
                <th className="p-2 text-left">النسبة</th>
                <th className="p-2 text-left">وصف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.level} className="border-t border-neutral-800">
                  <td className="p-2">{r.level}</td>
                  <td className="p-2">{r.percentage}%</td>
                  <td className="p-2">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}