import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 pb-6 text-center">
      <Link
        href="https://1stcite.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Powered by
        <img src="/1stcite-logo.png" alt="1stCite" className="h-4 w-auto inline-block" />
      </Link>
    </footer>
  );
}
