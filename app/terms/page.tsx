import LegalPage from "@/app/components/LegalPage";

export const metadata = { title: "Terms · 1stCite" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 29, 2026">
      <p>
        These terms cover using 1stCite to view, discuss and share conference talks. By signing in or uploading a
        talk, you agree to them.
      </p>

      <h2>For presenters</h2>
      <ul>
        <li>
          <strong>You keep ownership</strong> of everything you upload: your slides, summary and notes.
        </li>
        <li>
          You give 1stCite permission to store your talk and show it to attendees of your conference, and to its
          organizers, for as long as the talk is live. That permission ends when you take the talk down or its live
          period ends.
        </li>
        <li>
          You confirm you have the right to share what you upload, including any images, data or third-party
          material in it, and that it contains nothing you&apos;re obliged to keep confidential.
        </li>
        <li>
          Uploading is optional. You can replace, edit or take down your talk at any time from your presenter page.
        </li>
      </ul>

      <h2>For attendees</h2>
      <ul>
        <li>
          Talks are shared for your personal and professional use at the conference. Don&apos;t republish or
          redistribute a presenter&apos;s slides without their permission.
        </li>
        <li>
          Questions and comments should be relevant and respectful. Public comments are visible to everyone who can
          see the talk.
        </li>
        <li>
          When you ask a presenter to contact you, your email goes to that presenter. Use it for genuine professional contact.
        </li>
      </ul>

      <h2>For everyone</h2>
      <ul>
        <li>Don&apos;t upload unlawful content, malware, or material that infringes someone else&apos;s rights.</li>
        <li>Don&apos;t try to access talks, accounts or data that aren&apos;t yours.</li>
        <li>
          Conference organizers and 1stCite may remove content or access that breaks these terms or the
          conference&apos;s own policies.
        </li>
      </ul>

      <h2>No warranty</h2>
      <p>
        1stCite is provided as is. We work to keep it available and accurate but can&apos;t promise uninterrupted
        service. Talks and comments are the views of their authors, not of 1stCite or the conference.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, 1stCite isn&apos;t liable for indirect or consequential losses arising from use
        of the service.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; the date at the top shows the latest version.</p>

      <h2>Contact</h2>
      <p>
        Questions or takedown requests: <a href="mailto:bob@1stcite.com">bob@1stcite.com</a>. See also our{" "}
        <a href="/privacy">privacy page</a>.
      </p>
    </LegalPage>
  );
}
