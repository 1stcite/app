import LegalPage from "@/app/components/LegalPage";

export const metadata = { title: "Privacy · 1stCite" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 29, 2026">
      <p>
        1stCite helps conferences keep their talks available after the session: attendees can read a deck they
        missed, ask a question on a specific slide, and ask a presenter to get in touch. This page explains what we
        collect to do that, who sees it, and how to have it removed. The short version: we collect very little, we
        don&apos;t sell or advertise with it, and contact details you share go only to the person you shared them with.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Attendees:</strong> the name you type when you sign in; questions and comments you post; which talks
          you mark as interested, attending or saved; and which slides you view.
        </li>
        <li>
          <strong>Contact requests:</strong> if you send a presenter a private note and ask them to contact you, the
          email you enter.
        </li>
        <li>
          <strong>Presenters:</strong> your name, company, email, the slide deck you upload, its title and summary, and
          any slide notes you write.
        </li>
        <li>
          <strong>Organizers:</strong> conference settings such as the conference end date.
        </li>
      </ul>
      <p>We don&apos;t ask attendees for an email address to sign in, and we don&apos;t collect payment information.</p>

      <h2>Who sees what</h2>
      <table>
        <thead>
          <tr>
            <th>Information</th>
            <th>Who can see it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Uploaded decks, summaries and slide notes</td>
            <td>Attendees of that conference, for as long as the talk is live</td>
          </tr>
          <tr>
            <td>Public comments</td>
            <td>Everyone who can see the talk</td>
          </tr>
          <tr>
            <td>Questions marked for the presenter</td>
            <td>You and the presenter</td>
          </tr>
          <tr>
            <td>Private notes</td>
            <td>Only you</td>
          </tr>
          <tr>
            <td>Your name when you ask a question or mark a talk interested, attending or saved</td>
            <td>That talk&apos;s presenter</td>
          </tr>
          <tr>
            <td>Follow-up request details (email, organization, role, note)</td>
            <td>Only that talk&apos;s presenter</td>
          </tr>
          <tr>
            <td>Presenter email address</td>
            <td>The presenter and the conference organizers. Never shown to attendees</td>
          </tr>
          <tr>
            <td>Slide views</td>
            <td>Presenters and organizers see counts, never who viewed which slide</td>
          </tr>
        </tbody>
      </table>
      <p>
        Organizers see totals: how many people opened talks, how many questions and contact requests there were.
        They don&apos;t see attendee contact details or private notes through 1stCite. If a presenter asks the
        organizers to introduce them to someone who sent a private note, the organizers see that person&apos;s
        sign-in name and the talk, but not the note.
      </p>

      <h2>Cookies and storage</h2>
      <ul>
        <li>A sign-in cookie that keeps you signed in on this device.</li>
        <li>
          A random identifier, if you browse without signing in, so a person who opens a talk twice is counted once.
          It isn&apos;t linked to your identity.
        </li>
        <li>Small preferences, such as whether presenter notes are shown, stored in your browser.</li>
      </ul>
      <p>We don&apos;t use advertising cookies, third-party analytics or tracking pixels.</p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell or rent personal information.</li>
        <li>We don&apos;t show ads or share data with advertisers.</li>
        <li>We don&apos;t use presenters&apos; decks for anything other than showing them to their conference.</li>
      </ul>

      <h2>Where it&apos;s stored</h2>
      <p>
        1stCite runs on Vercel (hosting and file storage) and a managed database service, both in the United States.
        These providers process data only to run the service.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          Talks are visible for the period the conference sets, typically 30 days after it ends. Presenters can take a
          talk down or extend it at any time; organizers can take any talk down.
        </li>
        <li>Sign-in sessions expire after 12 hours for attendees and 14 days for presenters.</li>
        <li>You can delete your own comments and notes at any time. Deleting a note to a presenter also withdraws the email you shared with it.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        To see, correct or delete anything 1stCite holds about you, email{" "}
        <a href="mailto:bob@1stcite.com">bob@1stcite.com</a>. We&apos;ll respond within 30 days. Presenters can also
        remove their talk themselves from their presenter page.
      </p>

      <h2>Changes</h2>
      <p>If we change how we handle information, we&apos;ll update this page and the date at the top.</p>

      <h2>Contact</h2>
      <p>
        1stCite, Seattle, Washington. <a href="mailto:bob@1stcite.com">bob@1stcite.com</a>
      </p>
    </LegalPage>
  );
}
