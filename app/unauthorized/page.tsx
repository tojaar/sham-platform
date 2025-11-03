export default function UnauthorizedPage() {
  return (
    <main style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '2rem', color: '#dc2626' }}>🚫 ليس لديك صلاحية الدخول</h1>
      <p style={{ marginTop: '1rem' }}>هذه الصفحة مخصصة للمديرين فقط.</p>
    </main>
  );
}