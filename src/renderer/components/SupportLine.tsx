/**
 * The permanent privacy and crisis-resources line (vision.md §1.1, feature-specifications.md §12).
 * It has no close button on purpose.
 */
export function SupportLine() {
  return (
    <aside className="support-note" aria-label="Privacy and support">
      Your journal stays on this computer as plain files; nothing is sent anywhere unless you switch on an AI feature. Paroh is a journal, not therapy. If you are struggling or thinking about harming yourself, please reach out to someone you trust, a local crisis line, or emergency services.
    </aside>
  );
}
