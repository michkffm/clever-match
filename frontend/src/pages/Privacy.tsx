import { Link } from 'react-router-dom';
import { useLanguage } from '../utils/i18n';
export default function Privacy() {
 const en = useLanguage() === 'en';
 return <main id="main-content" tabIndex={-1} className="settings-container privacy-page">
  <h1>{en ? 'Privacy information' : 'Datenschutzinformationen'}</h1>
  <p>{en ? 'Clever Match processes your email address, password hash, profile details, photos, matches and chat messages to provide the service. Public profiles do not display your email address, surname or exact coordinates.' : 'Clever Match verarbeitet deine E-Mail-Adresse, den Passwort-Hash, Profilangaben, Fotos, Matches und Chatnachrichten für den Betrieb der Anwendung. Öffentliche Profile zeigen weder deine E-Mail-Adresse noch deinen Nachnamen oder genaue Koordinaten.'}</p>
  <p>{en ? 'Hosting: Render. Database: MongoDB Atlas. Password reset emails: Resend. Profile images: Cloudinary, when enabled. Language, display preferences and profile/session metadata are stored in your browser; refresh sessions use an HttpOnly cookie. Chat data cached locally is removed on sign-out.' : 'Hosting: Render. Datenbank: MongoDB Atlas. E-Mails zum Passwort-Reset: Resend. Profilbilder: Cloudinary, sofern aktiviert. Sprache, Anzeigeeinstellungen und Profil-/Sitzungsmetadaten werden im Browser gespeichert; für die Sitzungsverlängerung wird ein HttpOnly-Cookie verwendet. Lokal zwischengespeicherte Chatdaten werden beim Abmelden entfernt.'}</p>
  <p>{en ? 'You can hide your profile from discovery and block other users in the app. For access to or deletion of stored data, contact Michael Koch through the portfolio contact form.' : 'Du kannst dein Profil in der Suche ausblenden und andere Nutzer blockieren. Für Auskunft oder Löschung gespeicherter Daten erreichst du Michael Koch über das Portfolio-Kontaktformular.'}</p>
  <a href="https://michael-koch-portfolio.vercel.app/contact.html" target="_blank" rel="noopener noreferrer">{en ? 'Contact Michael Koch' : 'Michael Koch kontaktieren'}</a>
  <p><Link to="/settings">{en ? 'Back to settings' : 'Zurück zu den Einstellungen'}</Link></p>
 </main>;
}
