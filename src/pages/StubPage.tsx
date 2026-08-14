/** StubPage — branded placeholder for routes owned by page agents. */
import { Link } from 'react-router';

export default function StubPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="container-ysl grid min-h-[50vh] place-items-center py-24 text-center">
      <div>
        <img src="/ysl-logo.svg" alt="" className="mx-auto h-14 w-14" />
        <p className="eyebrow center mt-6 justify-center">Coming soon</p>
        <h1 className="display-2 mt-4">{title}</h1>
        <p className="lead mx-auto mt-4">{note ?? 'This page is being crafted by the YSL team.'}</p>
        <Link to="/" className="btn btn-primary mt-8">Back home</Link>
      </div>
    </div>
  );
}
