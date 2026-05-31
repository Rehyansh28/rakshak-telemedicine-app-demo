export default function PageContainer({ children, className = '', fullHeight = false }) {
  return (
    <div
      className={`max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-6 ${fullHeight ? 'h-[calc(100vh-64px)] flex flex-col' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
